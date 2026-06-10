import express from "express";
import {
  getAdminStats,  // ✅ Fixed: Use correct export name
  getPendingActions,
  getAdminActivities
} from "../../controllers/admin/adminDashboard.controller.js";
import { 
  verifyAdminToken, 
  requirePermission,
  logAdminAction 
} from "../../middlewares/adminAuth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminToken);

router.get(
  "/stats", 
  requirePermission('view_analytics'),
  logAdminAction('view_stats', 'system'),
  getAdminStats  // ✅ Fixed: Use correct function name
);

router.get(
  "/pending-actions", 
  requirePermission('view_analytics'),
  logAdminAction('view_pending', 'system'),
  getPendingActions
);

router.get(
  "/activities", 
  requirePermission('view_logs'),
  logAdminAction('view_activities', 'system'),
  getAdminActivities
);

export default router;