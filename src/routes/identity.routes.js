import express from "express";
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
  verifyDailyCheckIn,
  getCheckInStatus
} from "../controllers/identity.controller.js";

import { protect } from "../middlewares/auth.middleware.js"; // ✅ ADDED THIS IMPORT
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// =====================================================
// AUTH ROUTES (Public - no auth required)
// =====================================================
router.post("/register", registerUserNode);
router.post("/login", loginUserNode);
router.post("/verify-otp", verifyOtpToken);
router.post("/resend-otp", resendOtpToken);
router.post("/google-signin", handleGoogleSignIn);
router.post("/set-password", setPasswordNode);
router.get("/check-email", checkEmailAvailability);

// =====================================================
// CURRENT USER ROUTE - ✅ FIXED: Added protect middleware
// =====================================================
router.get("/current-user", protect, getCurrentUser);

// =====================================================
// PROFILE ROUTES - ✅ FIXED: Added protect middleware
// =====================================================
router.get("/profile", protect, getProfileNode);
router.post("/update-profile", protect, updateProfileNode);
router.post("/update-email", protect, updateEmailNode);
router.post("/update-password", protect, updatePasswordNode);
router.delete("/delete", protect, deleteAccountNode);

// =====================================================
// EMAIL CHANGE ROUTES - ✅ FIXED: Added protect middleware
// =====================================================
router.post("/request-email-change", protect, requestEmailChangeNode);
router.post("/verify-email-change", protect, verifyEmailChangeNode);

// =====================================================
// AVATAR ROUTES - ✅ FIXED: Added protect middleware
// =====================================================
router.post("/upload-avatar", protect, upload.single('avatar'), uploadAvatarNode);
router.delete("/delete-avatar", protect, deleteAvatarNode);

// =====================================================
// DASHBOARD METRICS ROUTE - ✅ FIXED: Added protect middleware
// =====================================================
router.get("/dashboard-metrics", protect, getDashboardMetrics);

// =====================================================
// REFERRAL ROUTES - ✅ FIXED: Added protect middleware
// =====================================================
router.get("/validate-referral/:code", validateReferralCodeEndpoint);
router.get("/my-referral-code/:email", protect, getMyReferralCode);
router.get("/referral-stats/:email", protect, getReferralStats);

// =====================================================
// DAILY CHECK-IN ROUTES - ✅ FIXED: Added protect middleware
// =====================================================
router.post("/investments/:id/check-in", protect, verifyDailyCheckIn);
router.get("/investments/:id/status", protect, getCheckInStatus);

export default router;