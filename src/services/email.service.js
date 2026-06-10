import nodemailer from "nodemailer";

/**
 * Send OTP email with customizable subject
 * @param {string} toEmail - Recipient email
 * @param {string} fullName - User's full name for personalization
 * @param {string} otpCode - 6-digit verification code
 * @param {string} [subject] - Optional custom subject line
 */
export const sendOtpEmail = async (toEmail, fullName, otpCode, subject) => {
  // ✅ Use port 465 with SSL (more firewall-friendly)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT) || 465,  // ✅ Port 465
    secure: true,  // ✅ true for SSL (port 465)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false  // Accept self-signed certs for dev
    }
  });

  // Default subject if not provided
  const emailSubject = subject || "🔒 Secure Authorization Token - eraX";

  const mailOptions = {
    from: `"eraX Security" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: emailSubject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>eraX Authorization</title>
        <style>
          body { margin: 0; padding: 0; background-color: #05070B; font-family: sans-serif; color: #E2E8F0; }
          .container { max-width: 560px; margin: 40px auto; background: #0B0E14; border: 1px solid #1E293B; border-radius: 16px; overflow: hidden; }
          .accent { height: 4px; background: linear-gradient(90deg, #F59E0B, #D97706); }
          .content { padding: 44px; }
          .logo { font-size: 26px; font-weight: 800; color: #FFFFFF; margin-bottom: 32px; }
          .logo span { color: #F59E0B; }
          h1 { font-size: 22px; color: #FFFFFF; margin-bottom: 16px; }
          p { font-size: 15px; line-height: 24px; color: #94A3B8; margin-bottom: 32px; }
          .otp-box { background: #111622; border: 1px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
          .otp-code { font-family: monospace; font-size: 38px; font-weight: 700; letter-spacing: 8px; color: #F59E0B; }
          .footer { font-size: 12px; color: #64748B; text-align: center; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="accent"></div>
          <div class="content">
            <div class="logo">era<span>X</span></div>
            <h1>${subject?.includes('Email Change') ? 'Verify New Email Address' : 'Verify Identity Context'}</h1>
            <p>Hello ${fullName},<br><br>${subject?.includes('Email Change') 
              ? 'Use the code below to confirm this email address for your eraX account.' 
              : 'Use the single-use authorization token below to fulfill your credentials verification.'}</p>
            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
            </div>
            <p>If you did not issue this request, you can safely ignore this email.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} eraX Security Engine. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE]: OTP email sent to ${toEmail} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[EMAIL SERVICE ERROR]: Failed to send OTP to ${toEmail}:`, error.message);
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};



// Add this function to your existing email.service.js

export const sendWithdrawalRequestEmail = async ({ userEmail, userName, amount, accountNumber, bankName, accountName, transactionId, requestedAt }) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL, // Your admin email in .env
    subject: `💸 New Withdrawal Request - $${amount.toFixed(2)}`,
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

  return transporter.sendMail(mailOptions);
};