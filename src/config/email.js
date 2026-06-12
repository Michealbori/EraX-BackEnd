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
  debug: true, // Enable debug logging
  logger: true // Enable logger
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

export default { otpTransporter, depositTransporter, verifyEmailConnections, sendOTPEmail };