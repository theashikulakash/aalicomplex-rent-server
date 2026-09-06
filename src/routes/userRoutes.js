import { Router } from "express";
import { listOwners, listUsers, createUser, updateUser, deleteUser } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/owners", listOwners);
router.use(requireAuth);

router.get("/", requireRole("admin"), listUsers);
router.post("/", requireRole("admin"), createUser);
router.patch("/:id", updateUser); // self or admin, enforced inside controller
router.delete("/:id", requireRole("admin"), deleteUser);

export default router;
