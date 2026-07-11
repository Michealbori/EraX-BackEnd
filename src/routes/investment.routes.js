import express from 'express';
import { 
  createInvestment,
  getUserInvestments,
  verifyDailyCheckIn,
  getClaimCode,
  validateDailyCode
} from '../controllers/investment.controller.js';
import { checkAndGenerateClaimCodes } from '../jobs/codeGenerator.js';
import { sendOTPEmail } from '../config/email.js';
import Investment from '../models/Investment.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// ✅ CREATE INVESTMENT - Requires JWT authentication
router.post('/create', protect, createInvestment);

// ✅ GET INVESTMENTS FOR USER - Requires JWT authentication
router.get('/user-investments', protect, getUserInvestments);

// ✅ VALIDATE CODE - Direct database validation
router.post('/validate-code/:investmentId', protect, validateDailyCode);

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

// ✅ DEBUG: Check all investments status
router.get('/debug/investments', async (req, res) => {
  try {
    const investments = await Investment.find({})
      .select('email status completedDays claimCode codeGeneratedAt codeExpiresAt createdAt investedAt cycleNumber currentValue totalInterestEarned')
      .sort({ createdAt: -1 });
    
    const now = new Date();
    
    const analysis = investments.map(inv => {
      const hoursSinceCodeGen = inv.codeGeneratedAt ? 
        Math.floor((now - new Date(inv.codeGeneratedAt)) / (1000 * 60 * 60)) : 'Never';
      
      const hoursUntilCodeGen = inv.codeGeneratedAt && new Date(inv.codeGeneratedAt) > now ?
        Math.floor((new Date(inv.codeGeneratedAt) - now) / (1000 * 60 * 60)) : 0;
      
      const needsCode = inv.status === 'active' && 
                       inv.completedDays < 30 && 
                       !inv.claimCode && 
                       inv.codeGeneratedAt && 
                       new Date(inv.codeGeneratedAt) <= now;
      
      return {
        id: inv._id,
        email: inv.email,
        status: inv.status,
        cycleNumber: inv.cycleNumber || 1,
        day: `${inv.completedDays}/30`,
        hasCode: !!inv.claimCode,
        code: inv.claimCode || null,
        codeGeneratedAt: inv.codeGeneratedAt ? new Date(inv.codeGeneratedAt).toLocaleString() : 'Never',
        codeExpiresAt: inv.codeExpiresAt ? new Date(inv.codeExpiresAt).toLocaleString() : 'Never',
        hoursSinceGen: hoursSinceCodeGen,
        hoursUntilGen: hoursUntilCodeGen,
        needsCode: needsCode,
        currentValue: inv.currentValue || inv.amount,
        totalInterestEarned: inv.totalInterestEarned || 0,
        createdAt: inv.createdAt ? new Date(inv.createdAt).toLocaleString() : 'Unknown',
        investedAt: inv.investedAt ? new Date(inv.investedAt).toLocaleString() : 'Unknown'
      };
    });
    
    const summary = {
      total: investments.length,
      active: investments.filter(i => i.status === 'active').length,
      needingCode: analysis.filter(a => a.needsCode).length,
      withCode: analysis.filter(a => a.hasCode).length
    };
    
    res.status(200).json({
      success: true,
      summary,
      investments: analysis,
      currentTime: now.toLocaleString()
    });
    
  } catch (error) {
    console.error('❌ Debug investments error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch investments',
      error: error.message 
    });
  }
});

// ✅ TEST: Send test email (remove in production)
router.get('/test-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const testCode = 'TEST1234';
    
    console.log('\n📧 ===== TESTING EMAIL SERVICE =====');
    console.log('To:', email);
    console.log('Code:', testCode);
    console.log('Type: daily_task');
    
    const result = await sendOTPEmail(email, testCode, 'daily_task');
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log('=========================================\n');
    
    res.status(200).json({ 
      success: true, 
      message: `Test email sent to ${email}`,
      code: testCode,
      messageId: result.messageId
    });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;