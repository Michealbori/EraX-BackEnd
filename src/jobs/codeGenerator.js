import cron from 'node-cron';
import crypto from 'crypto';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import { sendOTPEmail } from '../config/email.js';

const generateClaimCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
};

export const checkAndGenerateClaimCodes = async () => {
  try {
    console.log('\n🔍 [CODE GENERATOR] Starting check...');
    console.log(' Current time:', new Date().toLocaleString());
    
    const now = new Date();
    
    // ✅ Find investments needing codes
    const investmentsNeedingCode = await Investment.find({
      status: 'active',
      completedDays: { $lt: 30 },
      $or: [
        { claimCode: null },
        { claimCode: { $exists: false } },
        { claimCode: '' }
      ],
      codeGeneratedAt: { $lte: now }
    }).populate('user', 'email fullName');

    console.log(`📊 Found ${investmentsNeedingCode.length} investments needing codes`);

    if (investmentsNeedingCode.length === 0) {
      console.log('ℹ️  No investments need codes. This is normal if:');
      console.log('   - No active investments exist');
      console.log('   - All investments have codes already');
      console.log('   - Investments created less than 24 hours ago');
      console.log('   - All investments completed 30 days\n');
      
      // Show all active investments for debugging
      const allActive = await Investment.find({
        status: 'active',
        completedDays: { $lt: 30 }
      }).select('email completedDays claimCode codeGeneratedAt');
      
      console.log(`📋 All active investments (${allActive.length}):`);
      allActive.forEach((inv, i) => {
        const hoursAgo = inv.codeGeneratedAt ? 
          Math.floor((now - inv.codeGeneratedAt) / (1000 * 60 * 60)) : 'Never';
        console.log(`   ${i+1}. Day ${inv.completedDays}/30 - Has code: ${inv.claimCode ? 'YES' : 'NO'} - Generated: ${hoursAgo}h ago`);
      });
      console.log('');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const investment of investmentsNeedingCode) {
      try {
        console.log(`\n💰 Processing investment: ${investment._id}`);
        console.log(`   User: ${investment.email}`);
        console.log(`   Day: ${investment.completedDays + 1}/30`);
        
        // Generate unique code
        let claimCode;
        let attempts = 0;
        do {
          claimCode = generateClaimCode();
          const existing = await Investment.findOne({ claimCode });
          if (!existing) break;
          attempts++;
        } while (attempts < 10);

        if (!claimCode) {
          console.error('❌ Failed to generate unique code');
          failCount++;
          continue;
        }

        // Update investment
        investment.claimCode = claimCode;
        investment.codeGeneratedAt = now;
        investment.codeExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        investment.interestStatus = 'code_generated';
        
        await investment.save();

        console.log(`✅ Generated code: ${claimCode}`);
        console.log(`   Expires: ${investment.codeExpiresAt.toLocaleString()}`);

        // Send email
        if (investment.email) {
          try {
            console.log(`📧 Sending email to ${investment.email}...`);
            await sendOTPEmail(investment.email, claimCode, 'daily_task');
            console.log(`✅ Email sent successfully!`);
            successCount++;
          } catch (emailError) {
            console.error(`❌ Email failed:`, emailError.message);
            console.error(`   Error code:`, emailError.code);
            console.error(`   Status:`, emailError.status);
            failCount++;
          }
        } else {
          console.warn(`⚠️  No email address found`);
          failCount++;
        }

      } catch (error) {
        console.error(`❌ Error processing investment:`, error.message);
        failCount++;
      }
    }

    console.log(`\n✅ [CODE GENERATOR] Completed: ${successCount} sent, ${failCount} failed\n`);
    
  } catch (error) {
    console.error(' [CODE GENERATOR] Critical error:', error);
  }
};

export const startCodeGenerator = () => {
  console.log('\n🚀 [30-DAY CHALLENGE] Daily Code Generator starting...');
  
  const schedule = process.env.NODE_ENV === 'production' ? '0 9 * * *' : '*/20 * * * * *';
  
  cron.schedule(schedule, () => {
    console.log('\n⏰ [SCHEDULER] Running scheduled check...');
    checkAndGenerateClaimCodes();
  });
  
  console.log(`✅ Code generator scheduled: ${schedule}`);
  console.log(`   Testing: Every 20 seconds\n`);
  
  // Run immediately on startup
  setTimeout(() => {
    checkAndGenerateClaimCodes();
  }, 3000);
};