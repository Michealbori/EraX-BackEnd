import express from "express";
import {
  requestWithdrawal,
  getWithdrawalStatus,
  getWithdrawalHistory,
  checkEligibility
} from "../controllers/withdrawal.controller.js";

const router = express.Router();

// Check withdrawal eligibility
router.get("/check-eligibility/:email", checkEligibility);

// Request withdrawal
router.post("/request", requestWithdrawal);

// Get withdrawal status (for countdown)
router.get("/status/:id", getWithdrawalStatus);

// Get withdrawal history
router.get("/history/:email", getWithdrawalHistory);

export default router;