import cron from 'node-cron';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import { sendOTPEmail } from '../config/email.js';

// Helper: Generate unique 8-character code
const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

/**
 * JOB 1: SEND DAILY TASK CODES
 * Runs every day at 9:00 AM
 */
export const sendDailyTaskCodes = async () => {
  try {
    console.log('🔍 [DAILY TASK] Sending codes for today...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all ACTIVE investments where today's task is NOT completed
    const activeInvestments = await Investment.find({
      status: 'active',
      interestStatus: 'pending',
      isComplete: false,
      'dailyTasks.date': { $gte: today, $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      'dailyTasks.completed': false 
    }).populate('user');

    console.log(`📊 [DAILY TASK] Found ${activeInvestments.length} users needing today's code`);

    for (const inv of activeInvestments) {
      try {
        // Generate today's specific task code
        const taskCode = generateCode();

        // Send email to user
        if (inv.user && inv.user.email) {
          await sendOTPEmail(inv.user.email, taskCode, 'daily_task');
          console.log(`📧 [DAILY TASK] Sent code ${taskCode} to ${inv.user.email} for Day ${inv.completedDays + 1}`);
        }
      } catch (err) {
        console.error(`❌ [DAILY TASK] Failed for ${inv._id}:`, err.message);
      }
    }

    console.log('✅ [DAILY TASK] Dispatch complete');
  } catch (error) {
    console.error('❌ [DAILY TASK] Error:', error);
  }
};

/**
 * JOB 2: GENERATE FINAL CLAIM CODE
 * Runs every day at midnight (00:00)
 */
export const checkAndGenerateClaimCodes = async () => {
  try {
    console.log('🔍 [CLAIM CODE] Checking for completed investments...');
    
    const now = new Date();
    
    // Find investments that are marked complete but haven't received final claim code yet
    const completedInvestments = await Investment.find({
      isComplete: true,
      interestStatus: 'pending',
      claimCode: { $exists: false }
    }).populate('user');

    console.log(`📊 [CLAIM CODE] Found ${completedInvestments.length} ready for final claim`);

    for (const inv of completedInvestments) {
      try {
        // Handle extensions for missed days
        const missedDays = inv.dailyTasks.filter(t => !t.completed).length;
        
        if (missedDays > 0 && inv.extensionDays === 0) {
          inv.missedDays = missedDays;
          inv.extensionDays = missedDays;
          inv.actualEndDate = new Date(inv.expectedEndDate.getTime() + missedDays * 24 * 60 * 60 * 1000);
          await inv.save();
          
          if (inv.actualEndDate > now) {
            console.log(`⏳ [CLAIM CODE] Extended ${inv._id} by ${missedDays} days`);
            continue;
          }
        }

        // Generate FINAL unique claim code (different from daily codes)
        let claimCode, isUnique = false;
        while (!isUnique) {
          claimCode = generateCode();
          isUnique = !(await Investment.findOne({ claimCode }));
        }

        inv.claimCode = claimCode;
        inv.codeGeneratedAt = now;
        inv.codeExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        inv.interestStatus = 'code_generated';
        await inv.save();

        console.log(`✅ [CLAIM CODE] Generated FINAL code ${claimCode} for ${inv._id}`);

        // Send final claim email
        if (inv.user && inv.user.email) {
          await sendOTPEmail(inv.user.email, claimCode, 'claim_code');
          console.log(`📧 [CLAIM CODE] Sent final code to ${inv.user.email}`);
        }
      } catch (err) {
        console.error(`❌ [CLAIM CODE] Error on ${inv._id}:`, err.message);
      }
    }

    console.log('✅ [CLAIM CODE] Check complete');
  } catch (error) {
    console.error('❌ [CLAIM CODE] Error:', error);
  }
};

/**
 * START BOTH SCHEDULERS
 */
export const startCodeGenerators = () => {
  // Run immediately on startup
  sendDailyTaskCodes();
  checkAndGenerateClaimCodes();
  
  // Schedule Daily Task Codes at 9:00 AM every day
  cron.schedule('0 9 * * *', () => {
    console.log('⏰ [SCHEDULER] Running daily task code dispatch...');
    sendDailyTaskCodes();
  });

  // Schedule Final Claim Codes at Midnight
  cron.schedule('0 0 * * *', () => {
    console.log('⏰ [SCHEDULER] Running final claim code generation...');
    checkAndGenerateClaimCodes();
  });
  
  console.log('✅ [SCHEDULER] Both generators started');
};