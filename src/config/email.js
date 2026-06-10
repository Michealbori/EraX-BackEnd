import nodemailer from 'nodemailer';

// ✅ HARDCODED CREDENTIALS (Temporary fix)
const EMAIL_USER = "deckardshawn01@gmail.com";
const EMAIL_PASS = "olraqklfiieqekwn";
const DEPOSIT_EMAIL_USER = "deckardshawn01@gmail.com";
const DEPOSIT_EMAIL_PASS = "zikjsvrypdygzunw";

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
  }
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
  }
});

// Verify connections
export const verifyEmailConnections = async () => {
  try {
    await otpTransporter.verify();
    console.log('✅ OTP Email server is ready to send messages');
  } catch (error) {
    console.error('❌ OTP Email server connection failed:', error.message);
  }

  try {
    await depositTransporter.verify();
    console.log('✅ Deposit Email server is ready to send messages');
  } catch (error) {
    console.error('❌ Deposit Email server connection failed:', error.message);
  }
};

export default { otpTransporter, depositTransporter, verifyEmailConnections };