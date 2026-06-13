import nodemailer from 'nodemailer';

// ✅ HARDCODED CREDENTIALS (Temporary fix)
const EMAIL_USER = "deckardshawn01@gmail.com";
const EMAIL_PASS = "olraqklfiieqekwn";
const DEPOSIT_EMAIL_USER = "deckardshawn01@gmail.com";
const DEPOSIT_EMAIL_PASS = "zikjsvrypdygzunw";

console.log('\n' + '='.repeat(70));
console.log('📧 EMAIL CONFIGURATION LOADED');
console.log('='.repeat(70));
console.log('EMAIL_USER:', EMAIL_USER);
console.log('EMAIL_PASS:', EMAIL_PASS ? `✓ Set (${EMAIL_PASS.length} chars)` : '✗ EMPTY');
console.log('DEPOSIT_EMAIL_USER:', DEPOSIT_EMAIL_USER);
console.log('DEPOSIT_EMAIL_PASS:', DEPOSIT_EMAIL_PASS ? `✓ Set (${DEPOSIT_EMAIL_PASS.length} chars)` : '✗ EMPTY');
console.log('='.repeat(70) + '\n');

// Create transporter for OTP emails
export const otpTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: { 
    rejectUnauthorized: false 
  },
  debug: true,
  logger: true
});

// Create transporter for Deposit emails
export const depositTransporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: DEPOSIT_EMAIL_USER,
    pass: DEPOSIT_EMAIL_PASS,
  },
  tls: { 
    rejectUnauthorized: false 
  },
  debug: true,
  logger: true
});

// ✅ Send OTP Email Function
export const sendOTPEmail = async (to, otp, type = 'registration') => {
  console.log('\n📧 ===== SENDING OTP EMAIL =====');
  console.log('To:', to);
  console.log('OTP:', otp);
  console.log('Type:', type);
  console.log('From:', EMAIL_USER);
  
  try {
    const mailOptions = {
      from: `"EraX Security" <${EMAIL_USER}>`,
      to: to,
      subject: `EraX ${type === 'registration' ? 'Registration' : 'Verification'} OTP`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #f3ba2f; margin: 0;">Era<span style="color: white;">X</span></h1>
            <h2 style="color: white; margin-top: 20px;">Your Verification Code</h2>
            <div style="background: rgba(243, 186, 47, 0.1); border: 2px solid #f3ba2f; border-radius: 10px; padding: 20px; margin: 30px 0;">
              <p style="color: #f3ba2f; font-size: 48px; font-weight: bold; margin: 0; letter-spacing: 5px;">${otp}</p>
            </div>
            <p style="color: #ccc; font-size: 14px;">This code will expire in 10 minutes.</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">Do not share this code with anyone.</p>
          </div>
        </div>
      `
    };

    console.log('📤 Attempting to send email...');
    const info = await otpTransporter.sendMail(mailOptions);
    console.log('✅ OTP EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND OTP EMAIL');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Response:', error.response);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// ✅ Send Deposit Confirmation Email to User
export const sendDepositConfirmationEmail = async (to, amount, currency, network) => {
  console.log('\n📧 ===== SENDING DEPOSIT CONFIRMATION EMAIL =====');
  console.log('To:', to);
  console.log('Amount:', amount, currency);
  console.log('Network:', network);
  
  try {
    const mailOptions = {
      from: `"EraX Deposits" <${DEPOSIT_EMAIL_USER}>`,
      to: to,
      subject: `✅ Deposit Submitted - $${amount} ${currency}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; padding: 40px 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f3ba2f; }
            .logo { font-size: 36px; font-weight: bold; color: #f3ba2f; letter-spacing: 2px; }
            .content { text-align: center; color: #1e293b; }
            .greeting { font-size: 24px; font-weight: 600; margin-bottom: 15px; color: #0f172a; }
            .message { font-size: 16px; line-height: 1.6; margin-bottom: 25px; color: #475569; }
            .deposit-box { background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); color: #0f172a; font-size: 36px; font-weight: bold; padding: 25px; border-radius: 12px; margin: 30px 0; box-shadow: 0 4px 15px rgba(243, 186, 47, 0.3); }
            .details { background: #f8fafc; border-left: 4px solid #f3ba2f; padding: 20px; margin: 25px 0; text-align: left; border-radius: 4px; }
            .detail-row { margin: 10px 0; font-size: 14px; }
            .detail-label { font-weight: bold; color: #0f172a; }
            .detail-value { color: #475569; margin-left: 10px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; text-align: left; border-radius: 4px; }
            .warning-text { color: #92400e; font-size: 14px; line-height: 1.5; margin: 0; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .status { display: inline-block; background: #fbbf24; color: #0f172a; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">ERAX</div>
            </div>
            <div class="content">
              <div class="greeting">Deposit Submitted!</div>
              <div class="message">Your deposit request has been received and is pending admin approval.</div>
              
              <div class="deposit-box">$${amount} ${currency}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Network:</span>
                  <span class="detail-value">${network}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="status">⏳ Pending Approval</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Processing Time:</span>
                  <span class="detail-value">Usually within 10 minutes</span>
                </div>
              </div>
              
              <div class="warning">
                <p class="warning-text">
                  <strong>⚠️ What happens next?</strong><br>
                  • Our team will verify your transaction<br>
                  • Funds will be credited to your account automatically<br>
                  • You'll be redirected to your dashboard once approved<br>
                  • Keep your transaction screenshot safe
                </p>
              </div>
              
              <div class="message" style="font-size: 14px; color: #64748b;">
                If you have any questions, please contact our support team.
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} EraX. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Attempting to send deposit confirmation email...');
    const info = await depositTransporter.sendMail(mailOptions);
    console.log('✅ DEPOSIT CONFIRMATION EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND DEPOSIT CONFIRMATION EMAIL');
    console.error('Error:', error.message);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Verify connections
export const verifyEmailConnections = async () => {
  console.log('\n🔍 VERIFYING EMAIL CONNECTIONS...\n');
  
  try {
    console.log('Testing OTP transporter...');
    await otpTransporter.verify();
    console.log('✅ OTP Email server is ready to send messages\n');
  } catch (error) {
    console.error('❌ OTP Email server connection failed:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Response:', error.response);
    console.log('');
  }

  try {
    console.log('Testing Deposit transporter...');
    await depositTransporter.verify();
    console.log('✅ Deposit Email server is ready to send messages\n');
  } catch (error) {
    console.error('❌ Deposit Email server connection failed:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Response:', error.response);
    console.log('');
  }
};

export default { otpTransporter, depositTransporter, verifyEmailConnections, sendOTPEmail, sendDepositConfirmationEmail };