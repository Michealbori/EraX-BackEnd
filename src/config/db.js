import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // ✅ Use MONGODB_URI from .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log("\n🔍 Troubleshooting:");
    console.log("1. Check if MONGODB_URI is set in .env file");
    console.log("2. Verify your MongoDB Atlas connection string");
    console.log("3. Check if your IP is whitelisted in MongoDB Atlas\n");
    process.exit(1);
  }
};

export default connectDB;