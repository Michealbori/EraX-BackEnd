import express from 'express';
import { 
  createInvestment,
  getUserInvestments,
  completeDailyTask,
  claimInterestWithCode,
  getClaimCode,
  earlyWithdrawal
} from '../controllers/investment.controller.js';

const router = express.Router();

// ✅ CREATE INVESTMENT
router.post('/create', createInvestment);

// ✅ GET INVESTMENTS FOR USER
router.get('/user/:email', getUserInvestments);

// ✅ DAILY TASK ROUTES
router.post('/complete-daily-task/:investmentId', completeDailyTask);

// ✅ CLAIM INTEREST WITH CODE
router.post('/claim-with-code', claimInterestWithCode);
router.get('/claim-code/:investmentId', getClaimCode);

// ✅ EARLY WITHDRAWAL
router.post('/early-withdrawal/:id', earlyWithdrawal);

export default router;