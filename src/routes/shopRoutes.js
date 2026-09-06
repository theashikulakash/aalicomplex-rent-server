import { Router } from "express";
import {
  listShops,
  publicDirectory,
  createShop,
  updateShop,
  deleteShop,
} from "../controllers/shopController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// Public directory listing — no auth required
router.get("/directory", publicDirectory);

router.use(requireAuth);

router.get("/", listShops); // scoped per-role inside controller
router.post("/", requireRole("admin", "owner"), createShop);
router.patch("/:id", requireRole("admin", "owner"), updateShop); // ownership checked inside
router.delete("/:id", requireRole("admin"), deleteShop);

export default router;
