import Shop from "../models/Shop.js";
import Transaction from "../models/Transaction.js";
import { computeShopDue } from "../utils/dues.js";

// GET /api/stats/dues  -> outstanding rent due, shop-wise and (for admin)
// rolled up owner-wise. Due accrues one month at a time from each shop's
// agreement start date and stops accruing per period once a confirmed
// payment is logged for that period.
export async function getDues(req, res, next) {
  try {
    const { shop: shopId } = req.query;

    if (req.user.role === "collector") {
      if (!shopId) {
        return res.status(400).json({ message: "shop query param is required" });
      }
      const shop = await Shop.findById(shopId);
      if (!shop) return res.status(404).json({ message: "Shop not found" });

      const txs = await Transaction.find({ shop: shop._id, status: "confirmed" });
      const { totalDue, unpaidPeriods } = computeShopDue(shop, txs);
      return res.json({ shopId: shop._id, due: totalDue, unpaidPeriods });
    }

    const filter = req.user.role === "owner" ? { owner: req.user._id } : {};
    if (shopId) filter._id = shopId;

    const shops = await Shop.find(filter).populate("owner", "name");

    const shopResults = await Promise.all(
      shops.map(async (shop) => {
        const txs = await Transaction.find({ shop: shop._id, status: "confirmed" });
        const { totalDue, unpaidPeriods } = computeShopDue(shop, txs);
        return {
          shopId: shop._id,
          name: shop.name,
          block: shop.block,
          shopNumber: shop.shopNumber,
          ownerId: shop.owner?._id,
          ownerName: shop.owner?.name,
          due: totalDue,
          unpaidPeriods,
        };
      })
    );

    const totalDue = shopResults.reduce((sum, s) => sum + s.due, 0);

    if (req.user.role === "owner") {
      return res.json({ shops: shopResults, totalDue });
    }

    // Admin: also roll up total due per owner.
    const ownerMap = new Map();
    for (const s of shopResults) {
      const key = s.ownerId ? s.ownerId.toString() : "unassigned";
      if (!ownerMap.has(key)) {
        ownerMap.set(key, { ownerId: s.ownerId, ownerName: s.ownerName || "Unassigned", totalDue: 0 });
      }
      ownerMap.get(key).totalDue += s.due;
    }

    res.json({
      shops: shopResults,
      owners: Array.from(ownerMap.values()),
      grandTotalDue: totalDue,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/stats/metrics  -> role-aware dashboard counters
export async function getMetrics(req, res, next) {
  try {
    if (req.user.role === "admin") {
      const [totalShops, activeShops, allShops, monthTx] = await Promise.all([
        Shop.countDocuments(),
        Shop.countDocuments({ isActive: true }),
        Shop.find({ isActive: true }),
        Transaction.find({
          status: "confirmed",
          paymentDate: { $gte: startOfMonth() },
        }),
      ]);

      const expiring = allShops.filter((s) => s.agreementStatus === "expiring_soon").length;
      const expired = allShops.filter((s) => s.agreementStatus === "expired").length;
      const monthCollection = monthTx.reduce((sum, t) => sum + t.amount, 0);

      return res.json({
        totalShops,
        activeShops,
        agreementsExpiringSoon: expiring,
        agreementsExpired: expired,
        currentMonthCollection: monthCollection,
      });
    }

    if (req.user.role === "owner") {
      const shops = await Shop.find({ owner: req.user._id });
      const shopIds = shops.map((s) => s._id);
      const allTx = await Transaction.find({ shop: { $in: shopIds }, status: "confirmed" });

      const monthTx = allTx.filter((t) => new Date(t.paymentDate) >= startOfMonth());
      const lifetimePaid = allTx.reduce((sum, t) => sum + t.amount, 0);
      const currentMonthCollection = monthTx.reduce((sum, t) => sum + t.amount, 0);

      const currentPeriod = periodKey(new Date());
      const pendingDues = shops.filter(
        (s) => !allTx.some((t) => t.forPeriod === currentPeriod && t.shop.toString() === s._id.toString())
      ).length;

      return res.json({
        totalShops: shops.length,
        currentMonthCollection,
        lifetimePaid,
        pendingDuesCount: pendingDues,
      });
    }

    if (req.user.role === "collector") {
      const monthTx = await Transaction.find({
        collectedBy: req.user._id,
        status: "confirmed",
        paymentDate: { $gte: startOfMonth() },
      });
      const monthCollection = monthTx.reduce((sum, t) => sum + t.amount, 0);

      return res.json({
        collectionsThisMonth: monthTx.length,
        amountCollectedThisMonth: monthCollection,
      });
    }

    res.json({});
  } catch (err) {
    next(err);
  }
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function periodKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
