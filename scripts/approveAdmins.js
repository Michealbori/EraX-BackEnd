import mongoose from "mongoose";
import Admin from "../src/models/Admin.js";
import dotenv from "dotenv";

dotenv.config();

const approveAllPendingAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");

    const result = await Admin.updateMany(
      { status: "pending_approval" },
      { 
        $set: { 
          status: "active",
          approvedAt: new Date(),
          approvedBy: "system"
        }
      }
    );

    console.log(`✅ Approved ${result.modifiedCount} admin(s)`);
    
    // Show approved admins
    const approved = await Admin.find({ status: "active" }).select("email fullName role");
    console.log("\n📋 Active Admins:");
    approved.forEach(admin => {
      console.log(`  - ${admin.email} (${admin.role})`);
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

approveAllPendingAdmins();