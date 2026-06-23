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

// Send OTP/Task/Claim Email
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

// ✅ FINAL CLAIM CODE TEMPLATE
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

// ✅ DAILY TASK CODE TEMPLATE
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

// Regular OTP Email Template
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

// Send Deposit Confirmation Email
export const sendDepositConfirmationEmail = async (to, amount, currency, network) => {
  console.log('\n📧 ===== SENDING DEPOSIT EMAIL =====');
  console.log('To:', to);
  console.log('Amount:', amount, currency);
  console.log('Network:', network);
  
  try {
    const { data, error } = await resend.emails.send({
      from: `EraX Deposits <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject: `✅ Deposit Submitted - $${amount} ${currency}`,
      html: `
        <div style="font-family: Arial; background: #f4f4f4; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px;">
            <h2 style="color: #0f172a;">Deposit Submitted!</h2>
            <p style="color: #475569;">Your deposit of $${amount} ${currency} via ${network} has been received.</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ DEPOSIT EMAIL SENT SUCCESSFULLY!');
    return { success: true, messageId: data?.id };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT EMAIL');
    console.error('Error:', error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Send Withdrawal Request Email
export const sendWithdrawalRequestEmail = async ({ userEmail, userName, amount, accountNumber, bankName, accountName, transactionId }) => {
  console.log('\n💸 ===== SENDING WITHDRAWAL NOTIFICATION =====');
  console.log('To Admin:', process.env.ADMIN_EMAIL);
  
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
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">Email:</span><strong>${userEmail}</strong>
            </div>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      throw new Error(error.message);
    }

    console.log('✅ WITHDRAWAL EMAIL SENT!');
    return data;
    
  } catch (error) {
    console.error('❌ FAILED TO SEND WITHDRAWAL EMAIL');
    console.error('Error:', error.message);
    throw error;
  }
};

// Export everything
export default {
  sendOTPEmail,
  sendDepositConfirmationEmail,
  sendWithdrawalRequestEmail
};