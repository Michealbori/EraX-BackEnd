import express from "express";
import {
  // Admin Authentication
  registerAdmin,
  loginAdmin,
  
  // Admin Dashboard & Management
  getDashboardStats,  // ✅ Changed from getAdminStats
  getPendingActions,
  getRecentActivities,  // ✅ Changed from getAdminActivities
  getAllUsers,
  handleDepositAction,  // ✅ Changed from processDepositAction
  handleWithdrawalAction,  // ✅ Changed from processVerificationAction
  toggleUserStatus,
  exportUsersCSV,
  verifyUser  // ✅ Added this export
} from "../controllers/admin.controller.js";

const router = express.Router();

// ===== ADMIN AUTHENTICATION =====
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// ===== STATS & OVERVIEW =====
router.get("/stats", getDashboardStats);  // ✅ Updated function name
router.get("/pending-actions", getPendingActions);
router.get("/activities", getRecentActivities);  // ✅ Updated function name

// ===== USER MANAGEMENT =====
router.get("/users", getAllUsers);
router.get("/users/export", exportUsersCSV);
router.patch("/users/:id/status", toggleUserStatus);
router.post("/users/:id/verify", verifyUser);  // ✅ Added verify route

// ===== ACTION PROCESSING =====
router.post("/deposit/:id", handleDepositAction);  // ✅ Updated function name
router.post("/withdrawal/:id", handleWithdrawalAction);  // ✅ Updated function name

export default router;