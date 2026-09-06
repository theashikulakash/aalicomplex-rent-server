import Transaction from "../models/Transaction.js";
import Shop from "../models/Shop.js";
import { generateReceiptCode } from "../utils/lateFee.js";

// POST /api/transactions  (Collector logs a payment; Admin can also log directly)
export async function collectRent(req, res, next) {
  try {
    const { shop: shopId, amount, method, forPeriod, paymentDate } = req.body;

    if (!shopId || !amount || !forPeriod) {
      return res.status(400).json({ message: "shop, amount and forPeriod are required" });
    }

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // Prevent invalid double-entry for the same shop + period (PRD: error prompts for
    // invalid double-entries). Admin adjustments go through PATCH instead.
    const duplicate = await Transaction.findOne({
      shop: shopId,
      forPeriod,
      status: "confirmed",
    });
    if (duplicate) {
      return res.status(409).json({
        message: `Rent for ${forPeriod} has already been recorded for this shop`,
      });
    }

    const transaction = await Transaction.create({
      shop: shopId,
      collectedBy: req.user._id,
      amount,
      lateFee: 0,
      method: method || "cash",
      forPeriod,
      paymentDate: paymentDate || Date.now(),
      receiptCode: generateReceiptCode(),
    });

    res.status(201).json({ transaction });
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions  (RBAC-scoped logs, with filters)
// Admin -> all. Collector -> own logs. Owner -> logs for own shops.
export async function listTransactions(req, res, next) {
  try {
    const { shop, from, to } = req.query;
    const filter = {};

    if (req.user.role === "collector") {
      filter.collectedBy = req.user._id;
    } else if (req.user.role === "owner") {
      const ownShops = await Shop.find({ owner: req.user._id }).select("_id");
      filter.shop = { $in: ownShops.map((s) => s._id) };
    }

    if (shop) filter.shop = shop;
    if (from || to) {
      filter.paymentDate = {};
      if (from) filter.paymentDate.$gte = new Date(from);
      if (to) filter.paymentDate.$lte = new Date(to);
    }

    const transactions = await Transaction.find(filter)
      .populate("shop", "name block shopNumber")
      .populate("collectedBy", "name")
      .sort({ paymentDate: -1 });

    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/transactions/:id  (Admin adjustment/correction only)
export async function adjustTransaction(req, res, next) {
  try {
    const { amount, lateFee, status, adjustmentNote } = req.body;

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    if (amount !== undefined) transaction.amount = amount;
    if (lateFee !== undefined) transaction.lateFee = lateFee;
    if (status !== undefined) transaction.status = status;
    transaction.adjustmentNote = adjustmentNote;
    transaction.adjustedBy = req.user._id;

    await transaction.save();
    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}
