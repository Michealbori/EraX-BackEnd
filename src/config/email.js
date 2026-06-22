import nodemailer from 'nodemailer';

// 🔍 DEBUG: Check if .env is loaded
console.log('\n🔍 ===== DEBUGGING .env LOADING =====');
console.log('process.env.RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ EXISTS' : '❌ MISSING');
console.log('process.env.RESEND_API_KEY value:', process.env.RESEND_API_KEY);
console.log('process.env.RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
console.log('=====================================\n');

// ✅ Determine environment
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ✅ Check if using Resend (recommended) or Gmail
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const USE_RESEND = RESEND_API_KEY && RESEND_API_KEY.startsWith('re_');

// Gmail config (fallback)
const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const EMAIL_PORT = process.env.EMAIL_PORT || "587";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const DEPOSIT_EMAIL_HOST = process.env.DEPOSIT_EMAIL_HOST || "smtp.gmail.com";
const DEPOSIT_EMAIL_PORT = process.env.DEPOSIT_EMAIL_PORT || "587";
const DEPOSIT_EMAIL_USER = process.env.DEPOSIT_EMAIL_USER;
const DEPOSIT_EMAIL_PASS = process.env.DEPOSIT_EMAIL_PASS;

// Resend config - ✅ UPDATED TO USE erax.company
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@erax.company';

console.log('\n' + '='.repeat(70));
console.log('📧 EMAIL CONFIGURATION LOADED');
console.log('='.repeat(70));
console.log('Environment:', IS_PRODUCTION ? '🌍 PRODUCTION' : '💻 DEVELOPMENT');
console.log('Email Service:', USE_RESEND ? '✅ RESEND (Recommended)' : '⚠️ Gmail (Fallback)');
console.log('USE_RESEND value:', USE_RESEND);

if (USE_RESEND) {
  console.log('From Email:', RESEND_FROM_EMAIL);
  console.log('Domain:', RESEND_FROM_EMAIL.split('@')[1]);
  console.log('API Key:', RESEND_API_KEY.substring(0, 15) + '...');
  console.log('\n⚠️  IMPORTANT: Make sure erax.company is verified in Resend!');
  console.log('👉 Go to: https://resend.com/domains to verify your domain');
} else {
  console.log('⚠️  WARNING: Using Gmail SMTP (less reliable)');
  console.log('EMAIL_HOST:', EMAIL_HOST);
  console.log('EMAIL_PORT:', EMAIL_PORT);
  console.log('EMAIL_USER:', EMAIL_USER);
  console.log('EMAIL_PASS:', EMAIL_PASS ? `✓ Set (${EMAIL_PASS.length} chars)` : '✗ EMPTY - WILL FAIL!');
}
console.log('='.repeat(70) + '\n');

// ✅ Create transporter with optimized settings
export const otpTransporter = nodemailer.createTransport(
  USE_RESEND 
    ? {
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: RESEND_API_KEY,
        },
      }
    : {
        host: EMAIL_HOST,
        port: parseInt(EMAIL_PORT),
        secure: EMAIL_PORT === "465",
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
        tls: { 
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        debug: !IS_PRODUCTION,
        logger: true
      }
);

export const depositTransporter = nodemailer.createTransport(
  USE_RESEND
    ? {
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: {
          user: "resend",
          pass: RESEND_API_KEY,
        },
      }
    : {
        host: DEPOSIT_EMAIL_HOST,
        port: parseInt(DEPOSIT_EMAIL_PORT),
        secure: DEPOSIT_EMAIL_PORT === "465",
        auth: {
          user: DEPOSIT_EMAIL_USER,
          pass: DEPOSIT_EMAIL_PASS,
        },
        tls: { 
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        debug: !IS_PRODUCTION,
        logger: true
      }
);

// ✅ Verify transporter connection
export const verifyTransporter = async (transporter, name = 'Email') => {
  try {
    await transporter.verify();
    console.log(`✅ ${name} transporter is ready to send emails`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} transporter verification failed:`, error.message);
    return false;
  }
};

// ✅ Send OTP Email
export const sendOTPEmail = async (to, otp, type = 'registration') => {
  console.log('\n📧 ===== SENDING OTP EMAIL =====');
  console.log('To:', to);
  console.log('OTP:', otp);
  console.log('Type:', type);
  console.log('Service:', USE_RESEND ? 'Resend' : 'Gmail');
  console.log('From:', RESEND_FROM_EMAIL);
  console.log('Using Resend?', USE_RESEND);
  
  try {
    const mailOptions = {
      from: USE_RESEND 
        ? `EraX Security <${RESEND_FROM_EMAIL}>`
        : `"EraX Security" <${EMAIL_USER}>`,
      to: to,
      subject: `EraX ${type === 'registration' ? 'Registration' : 'Verification'} OTP`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>EraX Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden;">
                  <tr>
                    <td style="padding: 40px; text-align: center; border-bottom: 2px solid #f3ba2f;">
                      <div style="font-size: 42px; font-weight: 900; color: #f3ba2f; letter-spacing: 3px;">ERA<span style="color: #ffffff;">X</span></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px;">
                      <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 28px;">Verify Your Email</h1>
                      <p style="color: #94a3b8; margin: 0 0 25px 0;">Your verification code:</p>
                      <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); border-radius: 16px; padding: 35px; text-align: center;">
                        <div style="font-size: 52px; font-weight: 900; color: #0f1419; letter-spacing: 12px; font-family: monospace;">${otp}</div>
                        <div style="margin-top: 15px; font-size: 12px; color: #0f1419;">Expires in 10 minutes</div>
                      </div>
                      <div style="margin-top: 25px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 4px;">
                        <p style="color: #ef4444; margin: 0 0 10px 0; font-weight: bold;">⚠️ Security Notice</p>
                        <p style="color: #cbd5e1; margin: 0; font-size: 13px;">Never share this code with anyone. EraX staff will never ask for this code.</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px; text-align: center; color: #64748b; font-size: 12px;">
                      © ${new Date().getFullYear()} EraX. All rights reserved.
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

    console.log('📤 Sending email...');
    const info = await otpTransporter.sendMail(mailOptions);
    console.log('✅ OTP EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND OTP EMAIL');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Response:', error.response);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    // Helpful error messages
    if (error.message.includes('550')) {
      console.error('\n⚠️  DOMAIN VERIFICATION REQUIRED');
      console.error('📋 To fix this error:');
      console.error('1. Go to https://resend.com/domains');
      console.error('2. Add your domain: erax.company');
      console.error('3. Add the DNS records provided by Resend');
      console.error('4. Wait 5-10 minutes for DNS propagation');
      console.error('5. Update .env: RESEND_FROM_EMAIL=noreply@erax.company');
      console.error('6. Restart your server\n');
    }
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// ✅ Send Deposit Confirmation Email
export const sendDepositConfirmationEmail = async (to, amount, currency, network) => {
  console.log('\n📧 ===== SENDING DEPOSIT EMAIL =====');
  console.log('To:', to);
  console.log('Amount:', amount, currency);
  console.log('Network:', network);
  console.log('Service:', USE_RESEND ? 'Resend' : 'Gmail');
  
  try {
    const mailOptions = {
      from: USE_RESEND 
        ? `EraX Deposits <${RESEND_FROM_EMAIL}>`
        : `"EraX Deposits" <${DEPOSIT_EMAIL_USER}>`,
      to: to,
      subject: `✅ Deposit Submitted - $${amount} ${currency}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial; background: #f4f4f4; padding: 40px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px;">
            <div style="text-align: center; border-bottom: 2px solid #f3ba2f; padding-bottom: 20px; margin-bottom: 30px;">
              <div style="font-size: 36px; font-weight: bold; color: #f3ba2f;">ERAX</div>
            </div>
            <h2 style="color: #0f172a; margin: 0 0 15px 0;">Deposit Submitted!</h2>
            <p style="color: #475569; margin: 0 0 25px 0;">Your deposit request has been received.</p>
            <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); color: #0f172a; padding: 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
              <div style="font-size: 36px; font-weight: bold;">$${amount} ${currency}</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-left: 4px solid #f3ba2f; border-radius: 4px; margin: 25px 0;">
              <p style="margin: 5px 0;"><strong>Network:</strong> ${network}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ⏳ Pending Approval</p>
              <p style="margin: 5px 0;"><strong>Processing Time:</strong> Usually within 10 minutes</p>
            </div>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">© ${new Date().getFullYear()} EraX. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Sending deposit email...');
    const info = await depositTransporter.sendMail(mailOptions);
    console.log('✅ DEPOSIT EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT EMAIL');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

export default { 
  otpTransporter, 
  depositTransporter, 
  sendOTPEmail, 
  sendDepositConfirmationEmail,
  verifyTransporter
};