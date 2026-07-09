import express from 'express';
import { 
  createInvestment,
  getUserInvestments,
  verifyDailyCheckIn,
  getClaimCode
} from '../controllers/investment.controller.js';
import { checkAndGenerateClaimCodes } from '../jobs/codeGenerator.js';
import { sendOTPEmail } from '../config/email.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ✅ CREATE INVESTMENT - Requires JWT authentication
router.post('/create', protect, createInvestment);

// ✅ GET INVESTMENTS FOR USER - Requires JWT authentication
router.get('/user-investments', protect, getUserInvestments);

// ✅ DAILY CHECK-IN - Requires JWT authentication
router.post('/check-in/:investmentId', protect, verifyDailyCheckIn);

// ✅ CLAIM CODE - Requires JWT authentication
router.get('/claim-code/:investmentId', protect, getClaimCode);

// ✅ DEBUG: Manual code generation trigger (remove in production)
router.get('/debug/generate-codes', async (req, res) => {
  try {
    console.log('\n🔧 [DEBUG] Manual code generation triggered...');
    await checkAndGenerateClaimCodes();
    
    res.status(200).json({ 
      success: true, 
      message: 'Code generation check completed. Check server console for detailed logs.' 
    });
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Code generation failed',
      error: error.message 
    });
  }
});

// ✅ TEST: Send test email (remove in production)
router.get('/test-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const testCode = 'TEST1234';
    
    console.log(`\n📧 [TEST] Sending test email to ${email}...`);
    await sendOTPEmail(email, testCode, 'daily_task');
    
    res.status(200).json({ 
      success: true, 
      message: `Test email sent to ${email}`,
      code: testCode
    });
  } catch (error) {
    console.error('❌ Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message 
    });
  }
});

export default router;