import express from 'express';
import {
  registerUserNode,
  loginUserNode,
  verifyOtpToken,
  resendOtpToken,
  getProfileNode,
  updateProfileNode,
  updateEmailNode,
  updatePasswordNode,
  setPasswordNode,
  deleteAccountNode,
  requestEmailChangeNode,
  verifyEmailChangeNode,
  uploadAvatarNode,
  deleteAvatarNode,
  getDashboardMetrics,
  validateReferralCodeEndpoint,
  getMyReferralCode,
  getReferralStats,
  handleGoogleSignIn,
  checkEmailAvailability,
  getCurrentUser,
  createInvestment,
  getUserInvestments,
  getSurveyQuestions,
  submitSurvey,
  claimInterest,
  earlyWithdrawal,
  verifyDailyCheckIn,
  getCheckInStatus
} from '../controllers/identity.controller.js';

import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ==========================================
// AUTH ROUTES
// ==========================================
router.post('/register', registerUserNode);
router.post('/login', loginUserNode);
router.post('/google', handleGoogleSignIn);
router.post('/verify-otp', verifyOtpToken);
router.post('/resend-otp', resendOtpToken);
router.get('/check-email', checkEmailAvailability);

// ==========================================
// PROFILE & SETTINGS ROUTES
// ==========================================
router.get('/profile', protect, getProfileNode);
router.get('/current-user', protect, getCurrentUser);
router.put('/profile', protect, updateProfileNode);
router.put('/email', protect, updateEmailNode);
router.post('/set-password', protect, setPasswordNode);
router.put('/password', protect, updatePasswordNode);
router.delete('/account', protect, deleteAccountNode);
router.post('/request-email-change', protect, requestEmailChangeNode);
router.post('/verify-email-change', protect, verifyEmailChangeNode);
router.post('/upload-avatar', protect, uploadAvatarNode);
router.delete('/delete-avatar', protect, deleteAvatarNode);

// ==========================================
// DASHBOARD & REFERRALS ROUTES
// ==========================================
router.get('/dashboard-metrics', protect, getDashboardMetrics);
router.get('/referral/validate/:code', validateReferralCodeEndpoint);
router.get('/referral/code', protect, getMyReferralCode);
router.get('/referral-stats', protect, getReferralStats); // ✅ THIS IS THE MISSING ROUTE!

// ==========================================
// INVESTMENT ROUTES
// ==========================================
router.post('/investment/create', protect, createInvestment);
router.get('/investment/list', protect, getUserInvestments);
router.get('/investment/survey/:investmentId', protect, getSurveyQuestions);
router.post('/investment/survey/:id', protect, submitSurvey);
router.post('/investment/claim/:id', protect, claimInterest);
router.post('/investment/early-withdrawal/:id', protect, earlyWithdrawal);

// ==========================================
// DAILY CHECK-IN ROUTES
// ==========================================
router.post('/investment/check-in/:id', protect, verifyDailyCheckIn);
router.get('/investment/check-in-status/:id', protect, getCheckInStatus);

export default router;