import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import Investment from "../models/Investment.js";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import { sendDepositConfirmationEmail } from "../config/email.js";

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// MULTER CONFIGURATION
// ==========================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../uploads/deposits');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadsDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

export const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ==========================================
// HELPER
// ==========================================
const getSecureUser = async (req, res) => {
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) return user;
  }
  return null;
};

// ==========================================
// POST /api/deposit/notify-admin
// ==========================================
export const notifyAdmin = async (req, res) => {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("📢 [NOTIFY ADMIN] Request received");

    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const { amount, currency, network } = req.body;
    const screenshotFile = req.file;

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum deposit is $50"
      });
    }

    if (!screenshotFile) {
      return res.status(400).json({
        success: false,
        message: "Transaction screenshot is required"
      });
    }

    const screenshotPath = `/uploads/deposits/${screenshotFile.filename}`;
    const transactionId = `DEP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create deposit
    const deposit = await Deposit.create({
      user: user._id,
      email: user.email,
      amount: amountNum,
      currency: currency || 'USDT',
      network: network || 'TRC20',
      paymentMethod: 'crypto',
      transactionReference: transactionId,
      screenshotPath: screenshotPath,
      status: 'pending',
      transactionId,
      requestedAt: new Date()
    });

    console.log(`✅ Deposit created: ${deposit._id}`);

    // ✅ Send email to admin with BACKEND approval link
    try {
      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
      const approvalUrl = `${backendUrl}/api/deposit/approve/${deposit._id}`;
      
      console.log("🔗 Approval URL:", approvalUrl);
      
      await resend.emails.send({
        from: `EraX Deposits <${process.env.RESEND_FROM_EMAIL || 'noreply@erax.company'}>`,
        to: process.env.ADMIN_EMAIL || "deckardshawn01@gmail.com",
        subject: `🔔 New Deposit: $${amountNum} ${currency || 'USDT'}`,
        html: `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #0a111c; color: white; padding: 20px; border-radius: 12px;">
            <h2 style="color: #f3ba2f;">New Deposit Request</h2>
            <div style="background: #070d16; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>User:</strong> ${user.email}</p>
              <p><strong>Amount:</strong> $${amountNum} ${currency || 'USDT'}</p>
              <p><strong>Network:</strong> ${network || 'TRC20'}</p>
              <p><strong>Deposit ID:</strong> ${deposit._id}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" style="display: inline-block; background: #f3ba2f; color: #050a12; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">✅ Approve Deposit</a>
            </div>
            <p style="color: #8492a6; font-size: 12px; text-align: center;">
              This link will approve the deposit and credit the user's account.
            </p>
          </div>
        `
      });
      
      console.log("✅ Admin email sent!");
    } catch (emailError) {
      console.error("❌ Email failed:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Deposit request submitted",
      deposit: {
        id: deposit._id,
        transactionId: deposit.transactionId,
        amount: deposit.amount,
        status: deposit.status
      },
      depositId: deposit._id
    });

  } catch (error) {
    console.error("❌ NOTIFY ADMIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to notify admin",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// ✅ GET /api/deposit/approve/:depositId - ADMIN APPROVES (NO JWT NEEDED!)
// ==========================================
export const approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    console.log("🔍 Approval request for:", depositId);
    
    const deposit = await Deposit.findById(depositId);
    
    if (!deposit) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Deposit Not Found</title></head>
        <body style="font-family: Arial; background: #0a111c; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 40px; background: #0d131c; border-radius: 16px; max-width: 500px;">
            <h1 style="color: #ef4444;">❌ Deposit Not Found</h1>
            <p>The deposit ID ${depositId} does not exist.</p>
          </div>
        </body>
        </html>
      `);
    }

    if (deposit.status === 'completed') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Already Processed</title></head>
        <body style="font-family: Arial; background: #0a111c; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 40px; background: #0d131c; border-radius: 16px; max-width: 500px;">
            <h1 style="color: #f3ba2f;">⚠️ Already Processed</h1>
            <p>This deposit has already been approved.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Find user
    const user = await User.findById(deposit.user);
    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>User Not Found</title></head>
        <body style="font-family: Arial; background: #0a111c; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 40px; background: #0d131c; border-radius: 16px; max-width: 500px;">
            <h1 style="color: #ef4444;">❌ User Not Found</h1>
          </div>
        </body>
        </html>
      `);
    }

    // ✅ STEP 1: Update user balance
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + deposit.amount;
    user.balances.totalDeposited = (user.balances?.totalDeposited || 0) + deposit.amount;
    await user.save();

    // ✅ STEP 2: Mark deposit as completed
    deposit.status = 'completed';
    deposit.completedAt = new Date();
    deposit.adminNotes = 'Approved via email link';
    await deposit.save();

    // ✅ STEP 3: Auto-create investment
    const assetClass = 'stocks';
    const amountNum = deposit.amount;
    const interestAmount = amountNum;
    
    const startDate = new Date();
    const expectedEndDate = new Date(startDate);
    
    const TESTING_MODE = process.env.NODE_ENV !== 'production';
    if (TESTING_MODE) {
      expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
    } else {
      expectedEndDate.setDate(expectedEndDate.getDate() + 30);
    }

    const transactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const investment = await Investment.create({
      user: user._id,
      email: user.email,
      assetClass: assetClass,
      symbol: assetClass.toUpperCase(),
      name: `${assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Investment`,
      amount: amountNum,
      interestAmount: interestAmount,
      startDate: startDate,
      expectedEndDate: expectedEndDate,
      actualEndDate: expectedEndDate,
      totalDays: 30,
      completedDays: 0,
      missedDays: 0,
      extensionDays: 0,
      isComplete: false,
      dailyTasks: [],
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId,
      investedAt: startDate
    });

    deposit.autoInvested = true;
    deposit.investmentId = investment._id;
    await deposit.save();

    // Deduct from available balance (now invested)
    user.balances.availableLiquidity -= amountNum;
    user.balances.totalInvested = (user.balances?.totalInvested || 0) + amountNum;
    user.balances.currentInvestmentValue = (user.balances?.currentInvestmentValue || 0) + amountNum;
    await user.save();

    console.log(`✅ Approved: $${deposit.amount} | New Balance: $${user.balances.availableLiquidity}`);

    // ✅ Send confirmation email to user
    try {
      await sendDepositConfirmationEmail({
        userEmail: user.email,
        userName: user.fullName || user.email.split('@')[0],
        depositAmount: deposit.amount,
        investmentAmount: amountNum,
        transactionId: deposit.transactionId,
        investmentId: investment._id,
        expectedReturn: amountNum * 2,
        maturityDate: expectedEndDate,
        completedAt: new Date()
      });
      console.log("✅ User confirmation email sent");
    } catch (emailError) {
      console.error("❌ User email failed:", emailError.message);
    }

    // ✅ Return HTML success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Deposit Approved</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0a111c; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .box { text-align: center; padding: 40px; background: #0d131c; border-radius: 16px; border: 1px solid #162235; max-width: 500px; width: 90%; }
          .icon { width: 80px; height: 80px; background: #4ade80; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px; color: #0a111c; font-weight: bold; }
          h1 { color: #4ade80; margin: 10px 0; }
          p { color: #8492a6; margin: 10px 0; }
          .info-box { background: #070d16; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
          .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #162235; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #8492a6; }
          .info-value { color: #f3ba2f; font-weight: bold; }
          .admin-btn {
            display: inline-block;
            margin-top: 24px;
            padding: 14px 32px;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.2s ease;
          }
          .admin-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="icon">✓</div>
          <h1>✅ Deposit Approved!</h1>
          <p>$${deposit.amount} ${deposit.currency} has been credited to ${deposit.email}</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">User Email:</span>
              <span class="info-value">${deposit.email}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Amount Credited:</span>
              <span class="info-value">$${deposit.amount}</span>
            </div>
            <div class="info-row">
              <span class="info-label">New Balance:</span>
              <span class="info-value">$${user.balances.availableLiquidity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Investment Created:</span>
              <span class="info-value">$${amountNum} (30 days)</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value" style="color:#4ade80">Completed</span>
            </div>
          </div>
          
          <a href="/admin/users" class="admin-btn">
            👤 Go to User Admin Panel
          </a>
          
          <p style="color:#64748b;font-size:12px;margin-top:30px">
            Approved at: ${new Date().toLocaleString()}
          </p>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error("❌ Approval error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: Arial; background: #0a111c; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0;">
        <div style="text-align: center; padding: 40px; background: #0d131c; border-radius: 16px; max-width: 500px;">
          <h1 style="color: #ef4444;">❌ Error</h1>
          <p>${error.message}</p>
        </div>
      </body>
      </html>
    `);
  }
};

// ==========================================
// GET /api/deposit/status/:id - FOR POLLING
// ==========================================
export const getDepositStatus = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const { id } = req.params;
    const deposit = await Deposit.findById(id);
    
    if (!deposit) {
      return res.status(404).json({ 
        success: false, 
        message: "Deposit not found" 
      });
    }

    if (deposit.user.toString() !== user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized" 
      });
    }

    res.json({
      success: true,
      status: deposit.status,
      depositId: deposit._id,
      amount: deposit.amount,
      currency: deposit.currency,
      confirmedAt: deposit.completedAt
    });

  } catch (error) {
    console.error("❌ GET DEPOSIT STATUS ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get deposit status" 
    });
  }
};

// ==========================================
// GET /api/deposit/history
// ==========================================
export const getDepositHistory = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const deposits = await Deposit.find({ user: user._id })
      .sort({ requestedAt: -1 })
      .limit(20);

    const processedDeposits = deposits.map(d => ({
      id: d._id,
      transactionId: d.transactionId,
      amount: d.amount,
      paymentMethod: d.paymentMethod,
      status: d.status,
      requestedAt: d.requestedAt,
      completedAt: d.completedAt,
      autoInvested: d.autoInvested,
      investmentId: d.investmentId
    }));

    res.status(200).json({
      success: true,
      deposits: processedDeposits
    });

  } catch (error) {
    console.error("❌ GET DEPOSIT HISTORY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get deposit history" });
  }
};