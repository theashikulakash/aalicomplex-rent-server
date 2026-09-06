import { Router } from "express";
import { getMetrics, getDues } from "../controllers/statsController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/metrics", requireAuth, getMetrics);
router.get("/dues", requireAuth, getDues);

export default router;
