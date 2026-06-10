import express from "express";
import {
  registerAdmin,
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  changePassword,
  forgotPassword,    // ✅ This import
  resetPassword      // ✅ And this import
} from "../../controllers/admin/adminAuth.controller.js";
import { verifyAdminToken } from "../../middlewares/adminAuth.js";

const router = express.Router();

// Public routes (no auth required)
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes (auth required)
router.get("/me", verifyAdminToken, getCurrentAdmin);
router.post("/logout", verifyAdminToken, logoutAdmin);
router.post("/change-password", verifyAdminToken, changePassword);

export default router;