import { Router } from "express";
import Shop from "../models/Shop.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/notifications
// Returns agreement-expiry alerts scoped to the caller's role. Real email/SMS
// delivery is a background-job concern (see README for wiring a cron + provider);
// this endpoint powers the in-app alert banners/badges described in the PRD.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === "owner" ? { owner: req.user._id } : {};
    const shops = await Shop.find(filter);

    const notifications = shops
      .filter((s) => ["expiring_soon", "expired"].includes(s.agreementStatus))
      .map((s) => ({
        id: s._id,
        type: "agreement_" + s.agreementStatus,
        message:
          s.agreementStatus === "expired"
            ? `Agreement for ${s.block}-${s.shopNumber} has expired`
            : `Agreement for ${s.block}-${s.shopNumber} is expiring soon`,
        shopId: s._id,
        severity: s.agreementStatus === "expired" ? "high" : "medium",
      }));

    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

export default router;
