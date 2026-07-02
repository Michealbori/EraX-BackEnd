import express from 'express';
import { 
  createInvestment,
  getUserInvestments,
  verifyDailyCheckIn,
  getClaimCode
} from '../controllers/investment.controller.js';

import { protect } from '../middlewares/auth.middleware.js'; // ✅ Import JWT middleware

const router = express.Router();

// ✅ CREATE INVESTMENT - Requires JWT authentication
router.post('/create', protect, createInvestment);

// ✅ GET INVESTMENTS FOR USER - Requires JWT authentication (no email param needed)
router.get('/user-investments', protect, getUserInvestments);

// ✅ DAILY CHECK-IN - Requires JWT authentication
router.post('/check-in/:investmentId', protect, verifyDailyCheckIn);

// ✅ CLAIM CODE - Requires JWT authentication
router.get('/claim-code/:investmentId', protect, getClaimCode);

// ❌ EARLY WITHDRAWAL REMOVED - Users must complete all 30 days

export default router;