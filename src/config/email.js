import nodemailer from 'nodemailer';

// ✅ RESEND CONFIGURATION (Primary - Works on cloud)
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

// ✅ GMAIL CONFIGURATION (Fallback for local development)
const EMAIL_USER = process.env.EMAIL_USER || "deckardshawn01@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "olraqklfiieqekwn";
const DEPOSIT_EMAIL_USER = process.env.DEPOSIT_EMAIL_USER || "deckardshawn01@gmail.com";
const DEPOSIT_EMAIL_PASS = process.env.DEPOSIT_EMAIL_PASS || "zikjsvrypdygzunw";

console.log('\n' + '='.repeat(70));
console.log('📧 EMAIL CONFIGURATION LOADED');
console.log('='.repeat(70));
console.log('RESEND_API_KEY:', RESEND_API_KEY ? '✓ Set' : '✗ EMPTY (using Gmail fallback)');
console.log('RESEND_FROM_EMAIL:', RESEND_FROM_EMAIL);
console.log('EMAIL_USER:', EMAIL_USER);
console.log('='.repeat(70) + '\n');

// ✅ Use Resend if API key is available, otherwise use Gmail
const USE_RESEND = RESEND_API_KEY && RESEND_API_KEY.length > 10;

// Create transporter for OTP emails
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
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      }
);

// Create transporter for Deposit emails
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
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: DEPOSIT_EMAIL_USER,
          pass: DEPOSIT_EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      }
);

// ✅ Send OTP Email Function
export const sendOTPEmail = async (to, otp, type = 'registration') => {
  console.log('\n ===== SENDING OTP EMAIL =====');
  console.log('To:', to);
  console.log('OTP:', otp);
  console.log('Type:', type);
  console.log('Using:', USE_RESEND ? 'Resend' : 'Gmail');
  console.log('From:', USE_RESEND ? RESEND_FROM_EMAIL : EMAIL_USER);
  
  try {
    const mailOptions = {
      from: USE_RESEND 
        ? `EraX Security <${RESEND_FROM_EMAIL}>`
        : `"EraX Security" <${EMAIL_USER}>`,
      to: to,
      subject: `EraX ${type === 'registration' ? 'Registration' : 'Verification'} OTP`,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>EraX Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); border: 1px solid #2a3142;">
                  
                  <tr>
                    <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #1e2538 0%, #0f1419 100%); border-bottom: 2px solid #f3ba2f;">
                      <div style="margin-bottom: 10px;">
                        <span style="font-size: 42px; font-weight: 900; color: #f3ba2f; letter-spacing: 3px; text-shadow: 0 2px 10px rgba(243, 186, 47, 0.3);">ERA</span>
                        <span style="font-size: 42px; font-weight: 900; color: #ffffff; letter-spacing: 3px;">X</span>
                      </div>
                      <div style="font-size: 11px; color: #8b95a5; letter-spacing: 4px; text-transform: uppercase; margin-top: 8px;">
                        Secure Identity Verification
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 25px 40px 0 40px; text-align: center;">
                      <div style="display: inline-block; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 50px; padding: 8px 20px; font-size: 12px; color: #4ade80; font-weight: 600; letter-spacing: 1px;">
                        🔒 ENCRYPTED & SECURE
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 30px 40px 20px 40px;">
                      <h1 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 700; color: #ffffff; text-align: center; line-height: 1.3;">
                        Verify Your Email Address
                      </h1>
                      <p style="margin: 0 0 25px 0; font-size: 15px; color: #94a3b8; text-align: center; line-height: 1.6;">
                        Welcome to EraX! To complete your registration and secure your account, please use the verification code below:
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 10px 40px 30px 40px;">
                      <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 50%, #d97706 100%); border-radius: 16px; padding: 35px 20px; text-align: center; box-shadow: 0 10px 40px rgba(243, 186, 47, 0.4); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                        <div style="position: absolute; bottom: -30px; left: -30px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;"></div>
                        
                        <div style="font-size: 11px; color: #0f1419; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 15px; opacity: 0.8;">
                          Your Verification Code
                        </div>
                        
                        <div style="font-size: 52px; font-weight: 900; color: #0f1419; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                          ${otp}
                        </div>
                        
                        <div style="margin-top: 20px; font-size: 12px; color: #0f1419; font-weight: 600; opacity: 0.9;">
                          ⏱️ Expires in 10 minutes
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 40px 25px 40px;">
                      <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
                        <div style="font-size: 14px; font-weight: 700; color: #ef4444; margin-bottom: 10px;">
                          ⚠️ Security Notice
                        </div>
                        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.7;">
                          <div style="margin-bottom: 6px;">• This code will expire in <strong style="color: #f3ba2f;">10 minutes</strong></div>
                          <div style="margin-bottom: 6px;">• <strong style="color: #ef4444;">Never share</strong> this code with anyone</div>
                          <div>EraX staff will never ask for this code</div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 40px;">
                      <div style="height: 1px; background: linear-gradient(90deg, transparent, #2a3142, transparent);"></div>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 30px 40px 40px 40px; text-align: center;">
                      <div style="font-size: 12px; color: #64748b; line-height: 1.8;">
                        <div style="margin-bottom: 10px;">
                          © ${new Date().getFullYear()} EraX. All rights reserved.
                        </div>
                        <div style="font-size: 11px; color: #475569;">
                          If you didn't request this verification, you can safely ignore this email.
                        </div>
                      </div>
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

    console.log('📤 Attempting to send email...');
    const info = await otpTransporter.sendMail(mailOptions);
    console.log('✅ OTP EMAIL SENT SUCCESSFULLY!');
    console.log('Message ID:', info.messageId);
    console.log('='.repeat(70) + '\n');
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ FAILED TO SEND OTP EMAIL');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Full Error:', error);
    console.log('='.repeat(70) + '\n');
    
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// ✅ Send Deposit Confirmation Email to User
export const sendDepositConfirmationEmail = async (to, amount, currency, network) => {
  console.log('\n ===== SENDING DEPOSIT CONFIRMATION EMAIL =====');
  console.log('To:', to);
  console.log('Amount:', amount, currency);
  console.log('Network:', network);
  console.log('Using:', USE_RESEND ? 'Resend' : 'Gmail');
  
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

    console.log(' Attempting to send deposit confirmation email...');
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
  console.log('Using:', USE_RESEND ? 'Resend' : 'Gmail');
  
  try {
    console.log('Testing OTP transporter...');
    await otpTransporter.verify();
    console.log('✅ OTP Email server is ready to send messages\n');
  } catch (error) {
    console.error('❌ OTP Email server connection failed:', error.message);
    console.error('Error Code:', error.code);
    console.log('');
  }

  try {
    console.log('Testing Deposit transporter...');
    await depositTransporter.verify();
    console.log('✅ Deposit Email server is ready to send messages\n');
  } catch (error) {
    console.error('❌ Deposit Email server connection failed:', error.message);
    console.error('Error Code:', error.code);
    console.log('');
  }
};

export default { otpTransporter, depositTransporter, verifyEmailConnections, sendOTPEmail, sendDepositConfirmationEmail };