import cron from 'node-cron';
import Investment from '../models/Investment.js';
import User from '../models/User.js';

const startInvestmentCron = () => {
  console.log('📊 Starting investment growth cron job (runs every hour)...');

  // Run every hour to update investment values
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('\n🔄 [CRON] Updating investment values...');
      
      const now = new Date();
      
      // Find all active investments
      const investments = await Investment.find({
        status: { $in: ['active', 'matured'] }
      });

      if (investments.length === 0) {
        console.log('✅ No active investments to update');
        return;
      }

      console.log(`📊 Found ${investments.length} investments to update`);

      let updatedCount = 0;

      for (const investment of investments) {
        try {
          const daysSinceInvestment = Math.floor(
            (now - investment.investedAt) / (1000 * 60 * 60 * 24)
          );
          
          // Calculate growth (100% return over 30 days)
          const dailyGrowthRate = 1.0333; // ~3.33% daily
          const growthMultiplier = Math.pow(dailyGrowthRate, Math.min(daysSinceInvestment, 30));
          
          const currentValue = investment.amount * growthMultiplier;
          const totalGrowth = currentValue - investment.amount;
          
          // Update investment
          investment.currentValue = currentValue;
          investment.totalGrowth = totalGrowth;
          investment.growthPercentage = ((totalGrowth / investment.amount) * 100).toFixed(2);
          investment.lastUpdated = now;
          
          // Check if matured
          if (now >= investment.maturityDate && investment.status === 'active') {
            investment.status = 'matured';
            console.log(`✅ Investment ${investment._id} matured!`);
          }
          
          await investment.save();
          updatedCount++;
          
        } catch (err) {
          console.error(`❌ Error updating investment ${investment._id}:`, err.message);
        }
      }

      console.log(`✅ Updated ${updatedCount}/${investments.length} investments\n`);

    } catch (error) {
      console.error('❌ Investment cron error:', error);
    }
  });

  console.log('✅ Investment cron job scheduled successfully');
};

export default startInvestmentCron;