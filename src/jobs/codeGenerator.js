import cron from 'node-cron';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import { sendOTPEmail } from '../config/email.js';

/**
 * Generate unique 8-character claim code
 */
const generateClaimCode = () => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  return code;
};

/**
 * Check for completed investments and generate claim codes
 * TESTING MODE: Runs every 20 seconds
 */
export const checkAndGenerateClaimCodes = async () => {
  try {
    console.log('\n🔍 [CODE GENERATOR] Checking for completed investments...');
    console.log('⏰ Current time:', new Date().toLocaleTimeString());
    
    const now = new Date();
    
    // Find investments that are complete but don't have a claim code yet
    const completedInvestments = await Investment.find({
      isComplete: true,
      interestStatus: 'pending',
      claimCode: { $exists: false }
    }).populate('user');

    console.log(`📊 Found ${completedInvestments.length} completed investments`);

    for (const investment of completedInvestments) {
      try {
        // ⚠️ TESTING MODE: Temporarily bypassing the 24-hour maturity check so it generates immediately!
        // REMEMBER TO UNCOMMENT THIS BLOCK BEFORE GOING TO PRODUCTION!
        /*
        if (investment.actualEndDate > now) {
          console.log(`⏳ Investment ${investment._id} not ready yet. Wait until: ${investment.actualEndDate.toLocaleTimeString()}`);
          continue;
        }
        */

        // Generate unique claim code
        let claimCode;
        let isUnique = false;
        
        while (!isUnique) {
          claimCode = generateClaimCode();
          const existing = await Investment.findOne({ claimCode });
          isUnique = !existing;
        }

        // Update investment with claim code
        investment.claimCode = claimCode;
        investment.codeGeneratedAt = now;
        investment.codeExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
        investment.interestStatus = 'code_generated';
        
        await investment.save();

        console.log(`✅ Generated code ${claimCode} for investment ${investment._id}`);

        // Send email to user
        try {
          const user = investment.user;
          if (user && user.email) {
            // Sends the claim code via your existing email function
            await sendOTPEmail(user.email, claimCode, 'claim_code'); 
            console.log(`📧 Sent code to ${user.email}`);
          }
        } catch (emailError) {
          console.error(`❌ Email failed:`, emailError.message);
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

/**
 * Schedule the code generator
 * TESTING MODE: Runs every 20 seconds
 */
export const startCodeGenerator = () => {
  console.log('\n🚀 [TESTING MODE] Code generator starting...');
  console.log('⏰ Will check every 20 seconds for testing\n');
  
  // Run immediately on startup
  checkAndGenerateClaimCodes();
  
  // ✅ TESTING: Run every 20 seconds (Changed from */30)
  cron.schedule('*/20 * * * * *', () => {
    console.log('\n⏰ [SCHEDULER] Running 20-second check...');
    checkAndGenerateClaimCodes();
  });
  
  console.log('✅ Code generator scheduled - runs every 20 seconds (TESTING MODE)');
};