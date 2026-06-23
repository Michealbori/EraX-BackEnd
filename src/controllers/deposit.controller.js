import DepositRequest from "../models/DepositRequest.js";
import User from "../models/User.js";
import { sendDepositConfirmationEmail } from "../config/email.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLATFORM_WALLETS = {
  "USDT (TRC-20)": "TKbUyxpYxRskWZAVKaAXEyU23sDZWZ3LbN",
  BTC: "1GJRZhnSwNXYNtzEPN8daLi9b811sSsPWn",
  LTC: "LU38DPtoHiHBk7ynpv6SopMAa3GYwmT4go",
  ETH: "0x543a2f4566fa2416e1fd9baca0bc43f9b910579c"
};

export const getDepositAddress = async (req, res) => {
  try {
    const { currency, network } = req.body;
    const address = PLATFORM_WALLETS[currency] || PLATFORM_WALLETS["USDT (TRC-20)"];
    res.status(200).json({ success: true, address, currency, network });
  } catch (error) {
    console.error("❌ Get address error:", error);
    res.status(500).json({ message: "Failed to generate address." });
  }
};

export const submitTransaction = async (req, res) => {
  try {
    const { txHash, amount, currency, network, address } = req.body;
    const email = req.user?.email || req.body.email;
    if (!email || !amount || !currency || !network) return res.status(400).json({ message: "Missing required fields." });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const newDeposit = new DepositRequest({
      user: user._id, 
      email, 
      amount: parseFloat(amount), 
      currency, 
      network, 
      addressUsed: address, 
      txHash: txHash || undefined, 
      status: "confirming"  // ✅ FIXED: lowercase
    });
    await newDeposit.save();
    res.status(200).json({ success: true, message: "Transaction submitted for verification." });
  } catch (error) {
    console.error("❌ Submit transaction error:", error);
    res.status(500).json({ message: "Failed to submit transaction." });
  }
};

export const notifyAdminOfDeposit = async (req, res) => {
  try {
    const { email, amount, currency, network } = req.body;
    const screenshot = req.file;
    
    if (!email || !amount || !currency || !network) return res.status(400).json({ message: "Missing required fields." });
    if (amount < 200) return res.status(400).json({ message: "Minimum deposit is $200." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const depositReq = new DepositRequest({
      user: user._id, 
      email, 
      amount: parseFloat(amount), 
      currency, 
      network,
      screenshotPath: screenshot ? `/uploads/deposits/${screenshot.filename}` : null,
      status: "pending"  // ✅ FIXED: lowercase
    });
    await depositReq.save();
    console.log("✅ Deposit saved:", depositReq._id);

    // ✅ FIXED: Use production backend URL
    const backendUrl = process.env.BACKEND_URL || "https://erax-backend-o3hb.onrender.com";
    const approvalUrl = `${backendUrl}/api/deposit/approve/${depositReq._id}`;

    console.log("🔗 Approval URL:", approvalUrl);

    // ✅ Send email to ADMIN using Resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      await resend.emails.send({
        from: `EraX Deposits <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
        to: process.env.ADMIN_EMAIL || "deckardshawn01@gmail.com",
        subject: `🔔 New Deposit: $${amount} ${currency}`,
        html: `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #0a111c; color: white; padding: 20px; border-radius: 12px;">
            <h2 style="color: #f3ba2f;">New Deposit Request</h2>
            <div style="background: #070d16; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>User:</strong> ${email}</p>
              <p><strong>Amount:</strong> $${amount} ${currency}</p>
              <p><strong>Network:</strong> ${network}</p>
              <p><strong>Deposit ID:</strong> ${depositReq._id}</p>
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
      console.log("✅ Admin email sent via Resend!");
    } catch (emailErr) {
      console.error("❌ Admin email failed:", emailErr.message);
    }

    // ✅ Send confirmation email to USER
    try {
      await sendDepositConfirmationEmail(email, amount, currency, network);
      console.log("✅ User confirmation email sent!");
    } catch (userEmailErr) {
      console.error("❌ User email failed:", userEmailErr.message);
    }

    res.status(200).json({ success: true, message: "Deposit request submitted.", depositId: depositReq._id });
  } catch (error) {
    console.error("❌ Deposit error:", error);
    res.status(500).json({ message: error.message || "Failed to submit deposit." });
  }
};

// ✅ ADMIN APPROVES DEPOSIT (Redirects to User Admin Panel)
export const approveDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    console.log("🔍 Approval request for:", depositId);
    
    const deposit = await DepositRequest.findById(depositId).populate("user");
    if (!deposit) return res.status(404).send("<h1 style='color:white;text-align:center;font-family:Arial'>Deposit not found</h1>");
    if (deposit.status !== "pending") return res.status(400).send(`<h1 style='color:white;text-align:center;font-family:Arial'>Already processed: ${deposit.status}</h1>`);
    if (!deposit.user) return res.status(404).send("<h1 style='color:white;text-align:center;font-family:Arial'>User not found</h1>");

    const updateResult = await User.findByIdAndUpdate(
      deposit.user._id,
      { $inc: { "balances.availableLiquidity": deposit.amount, "balances.totalPortfolio": deposit.amount } },
      { new: true, runValidators: true }
    );

    if (!updateResult) throw new Error("Failed to update user balance");

    deposit.status = "confirmed";
    deposit.confirmedAt = new Date();
    await deposit.save();

    console.log(`✅ Approved: $${deposit.amount} | New Balance: $${updateResult.balances.availableLiquidity}`);

    // ✅ UPDATED SUCCESS PAGE WITH ADMIN PANEL LINK
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
          
          /* ✅ NEW BUTTON STYLES */
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
            border: none;
            cursor: pointer;
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
              <span class="info-value">$${updateResult.balances.availableLiquidity}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value" style="color:#4ade80">Confirmed</span>
            </div>
          </div>
          
          <!-- ✅ DIRECT LINK TO USER ADMIN PANEL -->
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
    res.status(500).send(`<h1 style='color:#ff4d4d;text-align:center;font-family:Arial'>Error: ${error.message}</h1>`);
  }
};

export const confirmDeposit = async (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = await DepositRequest.findById(depositId);
    if (!deposit || deposit.status !== "pending") return res.status(400).json({ message: "Already processed" });

    await User.findByIdAndUpdate(deposit.user, { $inc: { "balances.availableLiquidity": deposit.amount, "balances.totalPortfolio": deposit.amount } });
    deposit.status = "confirmed";
    await deposit.save();
    res.json({ success: true, message: "Deposit confirmed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ USER POLLING CHECKS THIS ENDPOINT
export const checkDepositStatus = async (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = await DepositRequest.findById(depositId);
    if (!deposit) return res.status(404).json({ message: "Deposit not found" });

    res.status(200).json({
      status: deposit.status,
      amount: deposit.amount,
      currency: deposit.currency,
      confirmedAt: deposit.confirmedAt
    });
  } catch (error) {
    console.error("❌ Status check error:", error);
    res.status(500).json({ message: "Failed to check status" });
  }
};