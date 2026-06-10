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
  setPasswordNode,  // ✅ NEW: Added import
  deleteAccountNode,
  requestEmailChangeNode,
  verifyEmailChangeNode,
  uploadAvatarNode,
  deleteAvatarNode,
  getDashboardMetrics,
  validateReferralCodeEndpoint,
  getMyReferralCode,
  getReferralStats,
  handleGoogleSignIn
} from "../controllers/identity.controller.js";
import { upload } from "../middlewares/upload.js";

const router = express.Router();

// =====================================================
// AUTH ROUTES
// =====================================================
router.post("/register", registerUserNode);
router.post("/login", loginUserNode);
router.post("/verify-otp", verifyOtpToken);
router.post("/resend-otp", resendOtpToken);

// ✅ Google Sign-In Route (Public - no auth required)
router.post("/google-signin", handleGoogleSignIn);

// ✅ NEW: Set Password Route (for Google users to set password)
router.post("/set-password", setPasswordNode);

// =====================================================
// PROFILE ROUTES
// =====================================================
router.get("/profile", getProfileNode);
router.post("/update-profile", updateProfileNode);
router.post("/update-email", updateEmailNode);
router.post("/update-password", updatePasswordNode);
router.delete("/delete", deleteAccountNode);

// =====================================================
// EMAIL CHANGE ROUTES
// =====================================================
router.post("/request-email-change", requestEmailChangeNode);
router.post("/verify-email-change", verifyEmailChangeNode);

// =====================================================
// AVATAR ROUTES - with upload middleware
// =====================================================
router.post("/upload-avatar", upload.single('avatar'), uploadAvatarNode);
router.delete("/delete-avatar", deleteAvatarNode);

// =====================================================
// DASHBOARD METRICS ROUTE
// =====================================================
router.get("/dashboard-metrics", getDashboardMetrics);

// =====================================================
// REFERRAL ROUTES
// =====================================================
router.get("/validate-referral/:code", validateReferralCodeEndpoint);
router.get("/my-referral-code/:email", getMyReferralCode);
router.get("/referral-stats/:email", getReferralStats);

export default router;