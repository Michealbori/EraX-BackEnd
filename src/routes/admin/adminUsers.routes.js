import express from "express";
import {
  getAllUsers,
  toggleUserStatus,
  verifyUser,
  deleteUser,
  exportUsersCSV
} from "../../controllers/admin/adminUsers.controller.js";
import { 
  verifyAdminToken, 
  requirePermission,
  logAdminAction 
} from "../../middlewares/adminAuth.js";

const router = express.Router();

router.use(verifyAdminToken);

// CRUD Operations
router.get(
  "/", 
  requirePermission('manage_users'),
  getAllUsers
);

router.patch(
  "/:id/status", 
  requirePermission('suspend_users'),
  toggleUserStatus
);

router.post(
  "/:id/verify", 
  requirePermission('manage_users'),
  verifyUser
);

router.delete(
  "/:id", 
  requirePermission('manage_users'),
  deleteUser
);

router.get(
  "/export", 
  requirePermission('export_data'),
  exportUsersCSV
);

export default router;