import express from 'express';
import {
  registerAdmin,
  loginAdmin,
  getDashboardStats,
  getPendingActions,
  getRecentActivities,
  getAllUsers,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  toggleUserStatus,
  handleDepositAction,
  handleWithdrawalAction,
  verifyUser,
  exportUsersCSV
} from '../controllers/admin.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ============================================
// ADMIN AUTHENTICATION (Public Routes)
// ============================================
router.post('/auth/register', registerAdmin);
router.post('/auth/login', loginAdmin);

// ============================================
// DASHBOARD ROUTES (Protected)
// ============================================
router.get('/dashboard/stats', verifyAdminToken, getDashboardStats);
router.get('/dashboard/pending-actions', verifyAdminToken, getPendingActions);
router.get('/dashboard/activities', verifyAdminToken, getRecentActivities);

// ============================================
// USER MANAGEMENT ROUTES (Protected)
// ============================================

// ✅ FIX: Export route MUST come before /users to avoid conflicts
router.get('/users/export', verifyAdminToken, exportUsersCSV);

// Get all users
router.get('/users', verifyAdminToken, getAllUsers);

// Create new user
router.post('/users', verifyAdminToken, createUserByAdmin);

// ✅ FIX: Specific routes with :id must come AFTER generic routes
// Verify user
router.post('/users/:id/verify', verifyAdminToken, verifyUser);

// Toggle user status
router.patch('/users/:id/status', verifyAdminToken, toggleUserStatus);

// Update user by ID
router.put('/users/:id', verifyAdminToken, updateUserByAdmin);

// Delete user by ID
router.delete('/users/:id', verifyAdminToken, deleteUserByAdmin);

// ============================================
// FINANCIAL OPERATIONS (Protected)
// ============================================
router.post('/deposit/:id', verifyAdminToken, handleDepositAction);
router.post('/withdrawal/:id', verifyAdminToken, handleWithdrawalAction);

export default router;