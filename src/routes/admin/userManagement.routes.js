import express from "express";
import {
  getAllUsersForManagement,
  createUser,
  updateUser,
  deleteUser
} from "../../controllers/admin/adminUserManagement.controller.js";
import { 
  verifyAdminToken, 
  requirePermission,
  logAdminAction 
} from "../../middlewares/adminAuth.js";

const router = express.Router();

// ✅ TEST ROUTE - Remove this after testing
router.get("/test", (req, res) => {
  res.json({ success: true, message: "User management route is working!" });
});

// All routes require admin authentication
router.use(verifyAdminToken);

// GET all users for management
router.get(
  "/", 
  requirePermission('view_analytics'),
  logAdminAction('view_users_management', 'system'),
  getAllUsersForManagement
);

// POST create new user
router.post(
  "/", 
  requirePermission('manage_users'),
  logAdminAction('create_user', 'user'),
  createUser
);

// PUT update user
router.put(
  "/:id", 
  requirePermission('manage_users'),
  logAdminAction('update_user', 'user'),
  updateUser
);

// DELETE user
router.delete(
  "/:id", 
  requirePermission('manage_users'),
  logAdminAction('delete_user', 'user'),
  deleteUser
);

export default router;