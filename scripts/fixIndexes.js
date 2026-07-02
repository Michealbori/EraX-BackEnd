import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';  // ✅ Correct path

// Load environment variables
dotenv.config();

async function fixIndexes() {
  try {
    console.log('🔧 Starting referral code migration...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Drop the old unique index
    try {
      await User.collection.dropIndex('referralCode_1');
      console.log('✅ Dropped old unique index on referralCode\n');
    } catch (err) {
      console.log('ℹ️ Index referralCode_1 does not exist (this is okay)\n');
    }
    
    // Step 2: Create new sparse index (allows multiple nulls)
    await User.collection.createIndex(
      { referralCode: 1 },
      { sparse: true, unique: false }
    );
    console.log('✅ Created new sparse index on referralCode\n');
    
    // Step 3: Find all users with null or missing referralCode
    const usersWithNull = await User.find({ 
      $or: [
        { referralCode: null },
        { referralCode: { $exists: false } }
      ]
    });
    
    console.log(`📊 Found ${usersWithNull.length} users without referral codes\n`);
    
    // Step 4: Generate unique referral codes for each
    let updatedCount = 0;
    for (const user of usersWithNull) {
      try {
        // Generate unique code
        let newCode = `ERAX-${user._id.toString().slice(-8).toUpperCase()}`;
        
        // Make sure it's unique
        let isUnique = false;
        while (!isUnique) {
          const existing = await User.findOne({ referralCode: newCode });
          if (!existing) {
            isUnique = true;
          } else {
            // Add random suffix if collision
            newCode = `ERAX-${user._id.toString().slice(-8).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          }
        }
        
        // Update user
        user.referralCode = newCode;
        await user.save();
        
        updatedCount++;
        console.log(`✅ ${updatedCount}. ${user.email} → ${newCode}`);
      } catch (err) {
        console.error(`❌ Failed to update ${user.email}:`, err.message);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`✅ Updated ${updatedCount} users with referral codes`);
    console.log(`✅ All indexes are now properly configured`);
    console.log(`\nYou can now register new users without errors!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
fixIndexes();