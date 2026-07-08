import cron from 'node-cron';
import crypto from 'crypto';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import { sendOTPEmail } from '../config/email.js';

// ==========================================
// Helper: Generate secure unique 8-character code
// ==========================================
const generateClaimCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
};

// ==========================================
// Check for active investments and generate daily codes
// ==========================================
export const checkAndGenerateClaimCodes = async () => {
  try {
    console.log('\n🔍 [CODE GENERATOR] Checking for investments needing today\'s code...');
    console.log('⏰ Current time:', new Date().toLocaleString());
    
    const now = new Date();
    
    // ✅ FIXED: Find investments where codeGeneratedAt is in the PAST or NOW
    // This means 24+ hours have passed since the last code generation
    const investmentsNeedingCode = await Investment.find({
      status: 'active',
      completedDays: { $lt: 30 }, // Not completed yet
      $or: [
        { claimCode: null }, // No current code
        { claimCode: { $exists: false } } // Field doesn't exist
      ],
      // ✅ KEY FIX: codeGeneratedAt must be in the past (24+ hours ago)
      codeGeneratedAt: { $lte: now }
    }).populate('user');

    console.log(`📊 Found ${investmentsNeedingCode.length} investments needing today's code`);

    if (investmentsNeedingCode.length === 0) {
      console.log('ℹ️  No investments need codes right now. Next check in 20 seconds (test) or 9 AM (production).\n');
      return;
    }

    for (const investment of investmentsNeedingCode) {
      try {
        // Generate unique 8-character code
        let claimCode;
        let isUnique = false;
        
        while (!isUnique) {
          claimCode = generateClaimCode();
          const existing = await Investment.findOne({ claimCode });
          isUnique = !existing;
        }

        // ✅ Update investment with today's code
        investment.claimCode = claimCode;
        investment.codeGeneratedAt = now;
        investment.codeExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry
        investment.interestStatus = 'code_generated';
        
        await investment.save();

        console.log(`✅ Generated Day ${investment.completedDays + 1} code: ${claimCode} for investment ${investment._id}`);
        console.log(`   User: ${investment.user?.email || investment.email}`);
        console.log(`   Code expires: ${investment.codeExpiresAt.toLocaleString()}`);

        // ✅ Send email to user
        const user = investment.user;
        if (user && user.email) {
          await sendOTPEmail(user.email, claimCode, 'daily_task');
          console.log(`📧 Sent Day ${investment.completedDays + 1} code to ${user.email}`);
        } else {
          console.warn(`⚠️  No email found for investment ${investment._id}`);
        }

      } catch (error) {
        console.error(`❌ Error processing investment ${investment._id}:`, error);
      }
    }

    console.log('✅ [CODE GENERATOR] Check completed\n');
    
  } catch (error) {
    console.error('❌ [CODE GENERATOR] Error:', error);
  }
};

// ==========================================
// Schedule the code generator
// ==========================================
export const startCodeGenerator = () => {
  console.log('\n🚀 [30-DAY CHALLENGE] Daily Code Generator starting...');
  
  // ✅ PRODUCTION: Run every day at 9:00 AM
  // ✅ TESTING: Run every 20 seconds
  const schedule = process.env.NODE_ENV === 'production' ? '0 9 * * *' : '*/20 * * * * *';
  
  cron.schedule(schedule, () => {
    console.log('\n⏰ [SCHEDULER] Running scheduled check...');
    checkAndGenerateClaimCodes();
  });
  
  console.log(`✅ Code generator scheduled: ${schedule}`);
  console.log(`   Production: Daily at 9:00 AM`);
  console.log(`   Testing: Every 20 seconds`);
  console.log(`   ⚠️  First code will be generated 24 hours after investment\n`);
};



