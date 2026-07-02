import express from "express";
import {
  requestWithdrawal,
  getWithdrawalStatus,
  getWithdrawalHistory,
  checkEligibility
} from "../controllers/withdrawal.controller.js";
import { protect } from "../middlewares/auth.middleware.js"; // ✅ Import JWT middleware

const router = express.Router();

// ✅ All routes require JWT authentication

// Check withdrawal eligibility
router.get("/check-eligibility", protect, checkEligibility);

// Request withdrawal
router.post("/request", protect, requestWithdrawal);

// Get withdrawal status (for countdown)
router.get("/status/:id", protect, getWithdrawalStatus);

// Get withdrawal history
router.get("/history", protect, getWithdrawalHistory);

export default router;