import Shop from "../models/Shop.js";

// GET /api/shops
// Admin -> all shops. Collector -> all active shops (for lookup). Owner -> own shops only.
export async function listShops(req, res, next) {
  try {
    const { block, status } = req.query;
    const filter = {};
    if (block) filter.block = block;
    if (req.user.role === "owner") filter.owner = req.user._id;

    let shops = await Shop.find(filter).populate("owner", "name email phone").sort({ block: 1, shopNumber: 1 });

    if (status) {
      shops = shops.filter((s) => s.agreementStatus === status);
    }

    res.json({ shops });
  } catch (err) {
    next(err);
  }
}

// GET /api/shops/directory  (public - only listed shops, honoring owner consent)
export async function publicDirectory(req, res, next) {
  try {
    const shops = await Shop.find({ isActive: true, listedInDirectory: true })
      .populate("owner", "name phone")
      .select("name block shopNumber owner contactVisibleInDirectory");

    const sanitized = shops.map((s) => {
      const obj = s.toObject();
      if (!obj.contactVisibleInDirectory) {
        obj.owner = { name: obj.owner?.name };
      }
      return obj;
    });

    res.json({ shops: sanitized });
  } catch (err) {
    next(err);
  }
}

// POST /api/shops  (Admin full create; Owner can submit own shop entry)
export async function createShop(req, res, next) {
  try {
    const { name, block, shopNumber, monthlyRent, agreement, owner } = req.body;

    if (!name || !block || !shopNumber || !monthlyRent || !agreement?.startDate || !agreement?.endDate) {
      return res.status(400).json({ message: "Missing required shop fields" });
    }

    const ownerId = req.user.role === "admin" && owner ? owner : req.user._id;

    const shop = await Shop.create({
      name,
      block,
      shopNumber,
      monthlyRent,
      agreement,
      owner: ownerId,
    });

    res.status(201).json({ shop });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A shop with this block and number already exists" });
    }
    next(err);
  }
}

// PATCH /api/shops/:id  (Admin: full edit. Owner: own shop, limited fields)
export async function updateShop(req, res, next) {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const isOwner = shop.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const allowedFields = isAdmin
      ? ["name", "block", "shopNumber", "monthlyRent", "agreement", "owner", "isActive", "listedInDirectory", "contactVisibleInDirectory"]
      : ["name", "listedInDirectory", "contactVisibleInDirectory"]; // owners manage their own consent flags

    for (const field of allowedFields) {
      if (field in req.body) shop[field] = req.body[field];
    }

    await shop.save();
    res.json({ shop });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/shops/:id  (Admin only)
export async function deleteShop(req, res, next) {
  try {
    const shop = await Shop.findByIdAndDelete(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    res.json({ message: "Shop deleted" });
  } catch (err) {
    next(err);
  }
}
