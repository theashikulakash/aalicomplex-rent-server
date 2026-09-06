import { Router } from "express";
import {
  collectRent,
  listTransactions,
  adjustTransaction,
} from "../controllers/transactionController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.post("/", requireRole("admin", "collector"), collectRent);
router.get("/", listTransactions); // scoped per-role inside controller
router.patch("/:id", requireRole("admin"), adjustTransaction);

export default router;
