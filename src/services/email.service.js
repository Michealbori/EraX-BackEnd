import nodemailer from "nodemailer";

// ✅ Create transporter ONCE (reusable) - better performance and reliability
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 465,
    secure: true,  // true for SSL (port 465)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:MEDIUM:!aNULL:!MD5:!DES'
    },
    // ✅ Better connection settings
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    // ✅ Debug mode (disable in production)
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
};

// ✅ Reusable transporter instance
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Send OTP email with customizable subject
 * @param {string} toEmail - Recipient email
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - 6-digit verification code
 * @param {string} [subject] - Optional custom subject line
 */
export const sendOtpEmail = async (toEmail, fullName, otpCode, subject) => {
  console.log('\n📧 ===== SENDING OTP EMAIL =====');
  console.log('To:', toEmail);
  console.log('From:', process.env.EMAIL_USER);
  console.log('OTP:', otpCode);
  console.log('Subject:', subject || '🔒 Secure Authorization Token - eraX');
  
  const currentTransporter = getTransporter();
  
  // Default subject if not provided
  const emailSubject = subject || "🔒 Secure Authorization Token - eraX";

  const mailOptions = {
    from: `"eraX Security" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: emailSubject,
    // ✅ ADD: Plain text version (helps avoid spam filters)
    text: `Hello ${fullName},\n\nYour eraX verification code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n© ${new Date().getFullYear()} eraX Security Engine`,
    // ✅ ADD: Better headers for deliverability
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'high',
      'X-Mailer': 'eraX Security Engine',
      'MIME-Version': '1.0',
      'Content-Type': 'multipart/alternative; boundary="eraX-boundary"'
    },
    // ✅ ADD: Alternative plain text part
    alternatives: [
      {
        contentType: 'text/plain',
        content: `Your eraX verification code: ${otpCode}`
      }
    ],
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>eraX Authorization</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #05070B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E2E8F0;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05070B; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; background: #0B0E14; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden;">
                
                <!-- Accent Bar -->
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #F59E0B, #D97706);"></td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 44px;">
                    
                    <!-- Logo -->
                    <div style="font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 32px; text-align: center;">
                      era<span style="color: #F59E0B;">X</span>
                    </div>
                    
                    <!-- Title -->
                    <h1 style="font-size: 22px; color: #FFFFFF; margin: 0 0 16px 0; text-align: center;">
                      ${subject?.includes('Email Change') ? 'Verify New Email Address' : 'Verify Identity Context'}
                    </h1>
                    
                    <!-- Message -->
                    <p style="font-size: 15px; line-height: 24px; color: #94A3B8; margin: 0 0 32px 0; text-align: center;">
                      Hello ${fullName},<br><br>
                      ${subject?.includes('Email Change') 
                        ? 'Use the code below to confirm this email address for your eraX account.' 
                        : 'Use the single-use authorization token below to fulfill your credentials verification.'}
                    </p>
                    
                    <!-- OTP Box -->
                    <div style="background: #111622; border: 1px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; margin: 0 auto 32px auto; max-width: 300px;">
                      <div style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #F59E0B;">
                        ${otpCode}
                      </div>
                      <div style="font-size: 12px; color: #64748B; margin-top: 12px;">
                        Expires in 10 minutes
                      </div>
                    </div>
                    
                    <!-- Security Notice -->
                    <div style="background: rgba(239, 68, 68, 0.05); border-left: 3px solid #ef4444; padding: 12px 16px; margin: 24px 0; border-radius: 4px;">
                      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">
                        <strong style="color: #ef4444;">⚠️ Security Notice:</strong> If you did not issue this request, you can safely ignore this email. Never share this code with anyone.
                      </p>
                    </div>
                    
                    <!-- Help Text -->
                    <p style="font-size: 14px; color: #64748B; text-align: center; margin: 24px 0 0 0;">
                      Need help? Contact us at <a href="mailto:support@erax.company" style="color: #F59E0B; text-decoration: none;">support@erax.company</a>
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 44px; border-top: 1px solid #1E293B; text-align: center;">
                    <p style="font-size: 12px; color: #64748B; margin: 0;">
                      © ${new Date().getFullYear()} eraX Security Engine. All rights reserved.
                    </p>
                    <p style="font-size: 11px; color: #475569; margin: 8px 0 0 0;">
                      This is an automated message. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    console.log('📤 Sending via SMTP...');
    const info = await currentTransporter.sendMail(mailOptions);
    
    console.log('✅ OTP EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('='.repeat(70) + '\n');
    
    return info;
  } catch (error) {
    console.error('❌ FAILED TO SEND OTP EMAIL');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    // ✅ Helpful error messages
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  AUTHENTICATION FAILED');
      console.error('📋 Possible causes:');
      console.error('1. App password is incorrect or expired');
      console.error('2. 2-Step Verification is not enabled');
      console.error('3. "Less secure apps" is disabled');
      console.error('\n💡 Fix: Generate a new App Password at:');
      console.error('https://myaccount.google.com/apppasswords\n');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
      console.error('\n⚠️  CONNECTION TIMEOUT');
      console.error('📋 Possible causes:');
      console.error('1. Firewall blocking port 465');
      console.error('2. Network issue');
      console.error('3. SMTP server down');
      console.error('\n💡 Fix: Try port 587 instead of 465\n');
    }
    
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};

/**
 * Send Withdrawal Request Email to Admin
 */
export const sendWithdrawalRequestEmail = async ({ userEmail, userName, amount, accountNumber, bankName, accountName, transactionId, requestedAt }) => {
  console.log('\n💸 ===== SENDING WITHDRAWAL NOTIFICATION =====');
  console.log('To Admin:', process.env.ADMIN_EMAIL);
  console.log('User:', userEmail);
  console.log('Amount:', amount);
  
  const currentTransporter = getTransporter();
  
  const mailOptions = {
    from: `"eraX Withdrawals" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `💸 New Withdrawal Request - $${amount.toFixed(2)}`,
    text: `New withdrawal request from ${userName} (${userEmail})\n\nAmount: $${amount.toFixed(2)}\nBank: ${bankName}\nAccount: ${accountName} - ${accountNumber}\nTransaction ID: ${transactionId}\nRequested: ${requestedAt.toLocaleString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d131c; color: #e2e8f0; padding: 20px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f3ba2f; margin: 0;">💸 New Withdrawal Request</h1>
        </div>
        
        <div style="background: rgba(243, 186, 47, 0.1); border: 1px solid #f3ba2f; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 4px;">Amount</div>
          <div style="font-size: 32px; font-weight: bold; color: #f3ba2f;">$${amount.toFixed(2)}</div>
        </div>
        
        <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #f3ba2f; margin: 0 0 12px 0; font-size: 16px;">User Information</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #94a3b8;">Name:</span>
            <strong>${userName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #94a3b8;">Email:</span>
            <strong>${userEmail}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Transaction ID:</span>
            <strong style="color: #f3ba2f;">${transactionId}</strong>
          </div>
        </div>
        
        <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h3 style="color: #f3ba2f; margin: 0 0 12px 0; font-size: 16px;">Bank Details</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #94a3b8;">Account Name:</span>
            <strong>${accountName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #94a3b8;">Bank Name:</span>
            <strong>${bankName}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Account Number:</span>
            <strong style="color: #f3ba2f;">${accountNumber}</strong>
          </div>
        </div>
        
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #94a3b8;">Requested At:</span>
            <strong>${requestedAt.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
            <span style="color: #94a3b8;">Countdown:</span>
            <strong style="color: #3b82f6;">20 minutes</strong>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #1e293b;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Please process this withdrawal in your admin dashboard.<br/>
            The user is currently viewing a 20-minute countdown timer.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await currentTransporter.sendMail(mailOptions);
    console.log('✅ WITHDRAWAL EMAIL SENT!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    return info;
  } catch (error) {
    console.error('❌ FAILED TO SEND WITHDRAWAL EMAIL');
    console.error('Error:', error.message);
    throw error;
  }
};

/**
 * ✅ NEW: Send Deposit Confirmation & Investment Started Email
 */
export const sendDepositConfirmationEmail = async ({
  userEmail,
  userName,
  depositAmount,
  investmentAmount,
  transactionId,
  investmentId,
  expectedReturn,
  maturityDate,
  completedAt
}) => {
  console.log('\n🎉 ===== SENDING DEPOSIT & INVESTMENT CONFIRMATION =====');
  console.log('To User:', userEmail);
  console.log('Deposit Amount:', depositAmount);
  console.log('Investment Amount:', investmentAmount);
  
  const currentTransporter = getTransporter();
  
  const subject = "🎉 Deposit Confirmed & Investment Started!";
  
  const mailOptions = {
    from: `"eraX Investments" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: subject,
    text: `Hi ${userName},\n\nYour deposit of $${depositAmount.toFixed(2)} has been confirmed and automatically converted into an investment!\n\nInvestment Amount: $${investmentAmount.toFixed(2)}\nExpected Return: $${expectedReturn.toFixed(2)}\nMaturity Date: ${new Date(maturityDate).toLocaleDateString()}\n\nYou'll receive daily check-in codes via email. Complete 30 days to double your money!\n\n© ${new Date().getFullYear()} eraX`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Deposit & Investment Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0b1120; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b1120; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: #1a2236; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f3ba2f, #d99e2b); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #0b1120; font-size: 28px; font-weight: 800;">
                      era<span style="color: #ffffff;">X</span>
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #0b1120; font-size: 16px;">Deposit Confirmed & Investment Started!</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    
                    <!-- Success Badge -->
                    <div style="background-color: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; font-size: 14px; font-weight: 600;">
                      ✅ Transaction Successful
                    </div>
                    
                    <!-- Greeting -->
                    <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 24px;">Hi ${userName},</h2>
                    <p style="color: #94a3b8; font-size: 15px; line-height: 24px; margin: 0 0 24px 0;">
                      Your deposit has been confirmed and automatically converted into an investment!
                    </p>
                    
                    <!-- Amount Box -->
                    <div style="background: rgba(243, 186, 47, 0.1); border: 2px solid #f3ba2f; padding: 24px; border-radius: 12px; margin: 0 0 32px 0; text-align: center;">
                      <div style="color: #94a3b8; font-size: 14px; margin-bottom: 8px;">Investment Amount</div>
                      <div style="font-size: 36px; font-weight: bold; color: #f3ba2f; margin-bottom: 12px;">$${investmentAmount.toFixed(2)}</div>
                      <div style="color: #94a3b8; font-size: 14px;">
                        Expected Return: <span style="color: #22c55e; font-weight: bold;">$${expectedReturn.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <!-- Investment Details -->
                    <h3 style="color: #f3ba2f; margin: 0 0 16px 0; font-size: 18px;">📊 Investment Details</h3>
                    
                    <div style="background: #0b1120; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #94a3b8;">Transaction ID:</span>
                        <span style="color: #ffffff; font-weight: 600;">${transactionId}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #94a3b8;">Investment ID:</span>
                        <span style="color: #ffffff; font-weight: 600;">${investmentId}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #94a3b8;">Start Date:</span>
                        <span style="color: #ffffff; font-weight: 600;">${new Date(completedAt).toLocaleDateString()}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #94a3b8;">Maturity Date:</span>
                        <span style="color: #ffffff; font-weight: 600;">${new Date(maturityDate).toLocaleDateString()}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="color: #94a3b8;">Duration:</span>
                        <span style="color: #ffffff; font-weight: 600;">30 Days</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                        <span style="color: #94a3b8;">ROI:</span>
                        <span style="color: #22c55e; font-weight: bold;">100% (Double Your Money)</span>
                      </div>
                    </div>
                    
                    <!-- Daily Check-In Info -->
                    <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 16px; margin: 0 0 24px 0; border-radius: 6px;">
                      <h4 style="margin: 0 0 10px 0; color: #60a5fa; font-size: 16px;">📧 Daily Check-In Codes</h4>
                      <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 22px;">
                        You'll receive a unique 8-character code via email every day. Enter it in your dashboard to track your progress and complete your 30-day challenge!
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 32px 0 0 0;">
                      <a href="${process.env.FRONTEND_URL || 'https://erax.company'}/investments" 
                         style="background: linear-gradient(135deg, #f3ba2f, #d99e2b); color: #0b1120; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                        View My Investment →
                      </a>
                    </div>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 40px; border-top: 1px solid #1e293b; text-align: center;">
                    <p style="font-size: 12px; color: #64748b; margin: 0;">
                      © ${new Date().getFullYear()} EraX. All rights reserved.
                    </p>
                    <p style="font-size: 11px; color: #475569; margin: 8px 0 0 0;">
                      This is an automated message. Please do not reply.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    console.log('📤 Sending deposit confirmation email...');
    const info = await currentTransporter.sendMail(mailOptions);
    
    console.log('✅ DEPOSIT CONFIRMATION EMAIL SENT!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    
    return info;
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT CONFIRMATION EMAIL');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    throw error;
  }
};

export default {
  sendOtpEmail,
  sendWithdrawalRequestEmail,
  sendDepositConfirmationEmail
};