import express from "express";
import {
  // Admin Authentication
  registerAdmin,
  loginAdmin,
  
  // Admin Dashboard & Management
  getAdminStats,
  getPendingActions,
  getAdminActivities,
  getAllUsers,
  processDepositAction,
  processVerificationAction,
  toggleUserStatus,
  exportUsersCSV
} from "../controllers/admin.controller.js";

const router = express.Router();

// ===== ADMIN AUTHENTICATION =====
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// ===== STATS & OVERVIEW =====
router.get("/stats", getAdminStats);
router.get("/pending-actions", getPendingActions);
router.get("/activities", getAdminActivities);

// ===== USER MANAGEMENT =====
router.get("/users", getAllUsers);
router.get("/users/export", exportUsersCSV);
router.patch("/users/:id/status", toggleUserStatus);

// ===== ACTION PROCESSING =====
router.post("/deposit/:id", processDepositAction);
router.post("/verification/:id", processVerificationAction);

export default router;