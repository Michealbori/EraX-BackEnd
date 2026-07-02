import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@erax.company';

console.log('\n' + '='.repeat(70));
console.log('📧 RESEND EMAIL SERVICE INITIALIZED');
console.log('='.repeat(70));
console.log('Environment:', IS_PRODUCTION ? '🌍 PRODUCTION' : '💻 DEVELOPMENT');
console.log('From Email:', RESEND_FROM_EMAIL);
console.log('Service: ✅ Resend Official SDK');
console.log('='.repeat(70) + '\n');

// ==========================================
// Send OTP/Task/Claim Email
// ==========================================
export const sendOTPEmail = async (to, code, type = 'registration') => {
  console.log('\n📧 ===== SENDING EMAIL =====');
  console.log('To:', to);
  console.log('Type:', type);
  console.log('Code:', code);
  
  try {
    let subject = '';
    let html = '';

    if (type === 'claim_code') {
      subject = '🎁 Your EraX Final Claim Code is Ready!';
      html = getClaimCodeEmailTemplate(code);
    } else if (type === 'daily_task') {
      subject = '📅 Your Daily Task Code for Today';
      html = getDailyTaskEmailTemplate(code);
    } else {
      subject = `EraX ${type === 'registration' ? 'Registration' : 'Verification'} OTP`;
      html = getOTPEmailTemplate(code);
    }

    const { data, error } = await resend.emails.send({
      from: `EraX Security <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: subject,
      html: html
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', data?.id);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND EMAIL');
    console.error('Error:', error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// ==========================================
// ✅ FINAL CLAIM CODE TEMPLATE
// ==========================================
const getClaimCodeEmailTemplate = (claimCode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Your EraX Claim Code</title></head>
    <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
            <tr><td style="padding: 40px; text-align: center; border-bottom: 2px solid #f3ba2f;">
              <div style="font-size: 42px; font-weight: 900; color: #f3ba2f; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
            </td></tr>
            <tr><td style="padding: 30px 40px;">
              <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 28px;">🎁 Your Final Claim Code is Ready!</h1>
              <p style="color: #94a3b8; margin: 0 0 25px 0;">Congratulations! You've completed all 30 days. Use this code to double your money:</p>
              
              <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); border-radius: 16px; padding: 35px; text-align: center;">
                <div style="font-size: 52px; font-weight: 900; color: #0f1419; letter-spacing: 12px; font-family: monospace;">${claimCode}</div>
                <div style="margin-top: 15px; font-size: 12px; color: #0f1419;">Expires in 7 days</div>
              </div>
              
              <div style="margin-top: 25px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 4px;">
                <p style="color: #10b981; margin: 0 0 10px 0; font-weight: bold;">✅ How to Claim:</p>
                <ol style="color: #cbd5e1; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Go to your EraX dashboard</li>
                  <li>Click on "Claim Interest"</li>
                  <li>Enter the code above</li>
                  <li>Your money will be doubled instantly!</li>
                </ol>
              </div>
              
              <p style="color: #64748b; font-size: 12px; margin-top: 25px; text-align: center;">
                This code expires in 7 days. Don't share it with anyone.
              </p>
            </td></tr>
            <tr><td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px;">
              © ${new Date().getFullYear()} EraX. All rights reserved.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
};

// ==========================================
// ✅ DAILY TASK CODE TEMPLATE
// ==========================================
const getDailyTaskEmailTemplate = (taskCode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>Your Daily Task Code</title></head>
    <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
            <tr><td style="padding: 40px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <div style="font-size: 42px; font-weight: 900; color: #3b82f6; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
            </td></tr>
            <tr><td style="padding: 30px 40px;">
              <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 28px;">📅 Your Daily Task Code</h1>
              <p style="color: #94a3b8; margin: 0 0 25px 0;">Enter this code in your dashboard to complete today's task:</p>
              
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 16px; padding: 35px; text-align: center;">
                <div style="font-size: 52px; font-weight: 900; color: #ffffff; letter-spacing: 12px; font-family: monospace;">${taskCode}</div>
                <div style="margin-top: 15px; font-size: 12px; color: rgba(255,255,255,0.8);">Valid for today only • Expires at midnight</div>
              </div>
              
              <div style="margin-top: 25px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 4px;">
                <p style="color: #3b82f6; margin: 0 0 10px 0; font-weight: bold;">ℹ️ Instructions:</p>
                <ol style="color: #cbd5e1; margin: 0; padding-left: 20px; font-size: 14px;">
                  <li>Open your EraX dashboard</li>
                  <li>Navigate to "Daily Tasks"</li>
                  <li>Enter the 8-character code above</li>
                  <li>Mark today as complete!</li>
                </ol>
              </div>
              
              <p style="color: #64748b; font-size: 12px; margin-top: 25px; text-align: center;">
                Don't share this code. A new code will be sent tomorrow morning.
              </p>
            </td></tr>
            <tr><td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px;">
              © ${new Date().getFullYear()} EraX. All rights reserved.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
};

// ==========================================
// ✅ REGULAR OTP EMAIL TEMPLATE
// ==========================================
const getOTPEmailTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>EraX Verification</title></head>
    <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
        <tr><td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
            <tr><td style="padding: 40px; text-align: center; border-bottom: 2px solid #f3ba2f;">
              <div style="font-size: 42px; font-weight: 900; color: #f3ba2f; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
            </td></tr>
            <tr><td style="padding: 30px 40px;">
              <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 28px;">Verify Your Email</h1>
              <p style="color: #94a3b8; margin: 0 0 25px 0;">Your verification code:</p>
              <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); border-radius: 16px; padding: 35px; text-align: center;">
                <div style="font-size: 52px; font-weight: 900; color: #0f1419; letter-spacing: 12px; font-family: monospace;">${otp}</div>
                <div style="margin-top: 15px; font-size: 12px; color: #0f1419;">Expires in 10 minutes</div>
              </div>
            </td></tr>
            <tr><td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px;">
              © ${new Date().getFullYear()} EraX. All rights reserved.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;
};

// ==========================================
// ✅ Send Deposit Confirmation Email (to User)
// ==========================================
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
  
  try {
    const subject = "🎉 Deposit Confirmed & Investment Started!";
    
    const { data, error } = await resend.emails.send({
      from: `EraX Investments <${RESEND_FROM_EMAIL}>`,
      to: [userEmail],
      subject: subject,
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
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ DEPOSIT CONFIRMATION EMAIL SENT!');
    console.log('Message ID:', data?.id);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT CONFIRMATION EMAIL');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    throw error;
  }
};

// ==========================================
// ✅ Send Withdrawal Request Email (to Admin)
// ==========================================
export const sendWithdrawalRequestEmail = async ({ 
  userEmail, 
  userName, 
  amount, 
  accountNumber, 
  bankName, 
  accountName, 
  transactionId,
  requestedAt 
}) => {
  console.log('\n💸 ===== SENDING WITHDRAWAL NOTIFICATION =====');
  console.log('To Admin:', process.env.ADMIN_EMAIL);
  console.log('User:', userEmail);
  console.log('Amount:', amount);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `EraX Withdrawals <${RESEND_FROM_EMAIL}>`,
      to: [process.env.ADMIN_EMAIL],
      subject: `💸 New Withdrawal Request - $${amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto; background: #0d131c; color: #e2e8f0; padding: 20px; border-radius: 12px;">
          <h1 style="color: #f3ba2f; text-align: center;">💸 New Withdrawal Request</h1>
          <div style="background: rgba(243,186,47,0.1); border: 1px solid #f3ba2f; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #f3ba2f;">$${amount.toFixed(2)}</div>
          </div>
          <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="color: #f3ba2f; margin: 0 0 12px;">User Information</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8;">Name:</span><strong>${userName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8;">Email:</span><strong>${userEmail}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Transaction ID:</span><strong style="color: #f3ba2f;">${transactionId}</strong>
            </div>
          </div>
          <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="color: #f3ba2f; margin: 0 0 12px;">Bank Details</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8;">Account Name:</span><strong>${accountName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #94a3b8;">Bank Name:</span><strong>${bankName}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Account Number:</span><strong style="color: #f3ba2f;">${accountNumber}</strong>
            </div>
          </div>
          <div style="text-align: center; margin-top: 24px; padding-top: 24px; border-top: 1px solid #1e293b;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Please process this withdrawal in your admin dashboard.
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ WITHDRAWAL EMAIL SENT!');
    console.log('Message ID:', data?.id);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND WITHDRAWAL EMAIL');
    console.error('Error:', error.message);
    throw error;
  }
};

// ==========================================
// ✅ UPDATED: Send Deposit Request Notification to Admin (WITH APPROVE BUTTON)
// ==========================================
export const sendDepositNotificationEmail = async ({ 
  userEmail, 
  userName, 
  amount, 
  currency, 
  network, 
  transactionId,
  depositId,
  requestedAt 
}) => {
  console.log('\n💰 ===== SENDING DEPOSIT NOTIFICATION TO ADMIN =====');
  console.log('To Admin:', process.env.ADMIN_EMAIL);
  console.log('User:', userEmail);
  console.log('Amount:', amount, currency);
  console.log('Network:', network);
  console.log('Deposit ID:', depositId);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `EraX Deposits <${RESEND_FROM_EMAIL}>`,
      to: [process.env.ADMIN_EMAIL],
      subject: `💰 New Deposit Request - $${parseFloat(amount).toFixed(2)} ${currency}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>New Deposit Request</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px; text-align: center; border-bottom: 2px solid #10b981;">
                      <div style="font-size: 42px; font-weight: 900; color: #10b981; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
                      <h1 style="color: #ffffff; margin: 15px 0 0 0; font-size: 24px;">💰 New Deposit Request</h1>
                    </td>
                  </tr>
                  
                  <!-- Amount Box -->
                  <tr>
                    <td style="padding: 30px 40px;">
                      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 48px; font-weight: bold; color: #ffffff; margin-bottom: 10px;">$${parseFloat(amount).toFixed(2)}</div>
                        <div style="font-size: 18px; color: rgba(255,255,255,0.9);">${currency} via ${network}</div>
                      </div>
                      
                      <!-- User Info -->
                      <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">👤 User Information</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #1e293b;">
                          <span style="color: #94a3b8;">Name:</span>
                          <strong style="color: #ffffff;">${userName}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #1e293b;">
                          <span style="color: #94a3b8;">Email:</span>
                          <strong style="color: #ffffff;">${userEmail}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #94a3b8;">Transaction ID:</span>
                          <strong style="color: #10b981; font-family: monospace;">${transactionId}</strong>
                        </div>
                      </div>
                      
                      <!-- Deposit Details -->
                      <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                        <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">📋 Deposit Details</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #94a3b8;">Network:</span>
                          <strong style="color: #ffffff;">${network}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #94a3b8;">Requested At:</span>
                          <strong style="color: #ffffff;">${new Date(requestedAt).toLocaleString()}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #94a3b8;">Status:</span>
                          <span style="color: #f59e0b; font-weight: bold;">⏳ Pending Review</span>
                        </div>
                      </div>
                      
                      <!-- ✅ NEW: APPROVE BUTTON SECTION -->
                      <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
                        <h3 style="color: #10b981; margin: 0 0 12px 0; font-size: 20px;">✅ Approve Deposit</h3>
                        <p style="color: #cbd5e1; margin: 0 0 20px 0; font-size: 14px;">
                          Click the button below to approve this deposit and automatically create the user's investment.
                        </p>
                        
                        <!-- ✅ APPROVE BUTTON -->
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deposits/approve/${depositId}?user=${encodeURIComponent(userEmail)}&amount=${amount}&network=${encodeURIComponent(network)}&userName=${encodeURIComponent(userName)}&transactionId=${encodeURIComponent(transactionId)}" 
                           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                          ✅ Approve Deposit Now
                        </a>
                      </div>
                      
                      <!-- View Details Button -->
                      <div style="text-align: center; margin-bottom: 20px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deposits/approved/${transactionId}?user=${encodeURIComponent(userEmail)}&amount=${amount}&network=${encodeURIComponent(network)}&userName=${encodeURIComponent(userName)}" 
                           style="display: inline-block; background: transparent; color: #f3ba2f; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; border: 2px solid #f3ba2f;">
                          View Details →
                        </a>
                      </div>
                      
                      <!-- Note -->
                      <div style="padding: 15px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 4px;">
                        <p style="color: #60a5fa; margin: 0; font-size: 13px;">
                          <strong>ℹ️ Note:</strong> The user has uploaded a transaction screenshot. Please verify the payment before approving.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1e293b;">
                      <p style="margin: 0;">© ${new Date().getFullYear()} EraX. All rights reserved.</p>
                      <p style="margin: 8px 0 0 0;">This is an automated notification from the EraX platform.</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ DEPOSIT NOTIFICATION EMAIL SENT!');
    console.log('Message ID:', data?.id);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT NOTIFICATION');
    console.error('Error:', error.message);
    throw error;
  }
};

// ==========================================
// ✅ NEW: Send Investment Renewal Email (Auto-Renewal Notification)
// ==========================================
export const sendInvestmentRenewalEmail = async ({
  userEmail,
  userName,
  profitAmount,
  lockedAmount,
  cycleNumber,
  newCycleNumber,
  nextEndDate
}) => {
  console.log('\n🔄 ===== SENDING INVESTMENT RENEWAL EMAIL =====');
  console.log('To User:', userEmail);
  console.log('Profit:', profitAmount);
  console.log('Cycle:', cycleNumber, '->', newCycleNumber);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `EraX Investments <${RESEND_FROM_EMAIL}>`,
      to: [userEmail],
      subject: `🎉 Cycle ${cycleNumber} Complete! $${profitAmount.toFixed(2)} Profit Released`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Investment Renewed</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
                  
                  <tr>
                    <td style="padding: 40px; text-align: center; border-bottom: 2px solid #10b981;">
                      <div style="font-size: 42px; font-weight: 900; color: #10b981; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
                      <h1 style="color: #ffffff; margin: 15px 0 0 0; font-size: 24px;">🎉 Investment Cycle Complete!</h1>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 30px 40px;">
                      <h2 style="color: #ffffff; margin: 0 0 15px 0;">Hi ${userName},</h2>
                      <p style="color: #94a3b8; margin: 0 0 25px 0;">
                        Congratulations! Your investment Cycle ${cycleNumber} has completed successfully.
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Profit Released</div>
                        <div style="font-size: 48px; font-weight: bold; color: #ffffff;">$${profitAmount.toFixed(2)}</div>
                        <div style="font-size: 14px; color: rgba(255,255,255,0.9); margin-top: 8px;">Now available for withdrawal</div>
                      </div>
                      
                      <div style="background: #070d16; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">📊 Investment Summary</h3>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #94a3b8;">Completed Cycle:</span>
                          <strong style="color: #ffffff;">Cycle ${cycleNumber}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #94a3b8;">Profit Earned:</span>
                          <strong style="color: #10b981;">$${profitAmount.toFixed(2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                          <span style="color: #94a3b8;">Locked Principal:</span>
                          <strong style="color: #f59e0b;">$${lockedAmount.toFixed(2)}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                          <span style="color: #94a3b8;">New Cycle:</span>
                          <strong style="color: #ffffff;">Cycle ${newCycleNumber}</strong>
                        </div>
                      </div>
                      
                      <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
                        <p style="color: #60a5fa; margin: 0; font-size: 14px;">
                          <strong>🔄 Auto-Renewal:</strong> Your locked principal of $${lockedAmount.toFixed(2)} has automatically started Cycle ${newCycleNumber} and will mature on ${new Date(nextEndDate).toLocaleDateString()}.
                        </p>
                      </div>
                      
                      <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'https://erax.company'}/dashboard/overview" 
                           style="display: inline-block; background: linear-gradient(135deg, #f3ba2f 0%, #d99e2b 100%); color: #0f1419; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">
                          View Dashboard →
                        </a>
                      </div>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #1e293b;">
                      <p style="margin: 0;">© ${new Date().getFullYear()} EraX. All rights reserved.</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ RENEWAL EMAIL SENT!');
    console.log('Message ID:', data?.id);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND RENEWAL EMAIL');
    console.error('Error:', error.message);
    throw error;
  }
};

// ==========================================
// ✅ Export all functions
// ==========================================
export default {
  sendOTPEmail,
  sendDepositConfirmationEmail,
  sendWithdrawalRequestEmail,
  sendDepositNotificationEmail,
  sendInvestmentRenewalEmail
};