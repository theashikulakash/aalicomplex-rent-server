import { Router } from "express";
import { exportPdf, exportXlsx } from "../controllers/exportController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/pdf", exportPdf);
router.get("/xlsx", exportXlsx);

export default router;
