import { otpTransporter } from '../config/email.js';

export const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: `"EraX Verification" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '🔐 EraX - Email Verification Code',
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
          .otp-box { background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 100%); color: #0f172a; font-size: 42px; font-weight: bold; padding: 25px; border-radius: 12px; margin: 30px 0; letter-spacing: 8px; box-shadow: 0 4px 15px rgba(243, 186, 47, 0.3); }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; text-align: left; border-radius: 4px; }
          .warning-text { color: #92400e; font-size: 14px; line-height: 1.5; margin: 0; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">ERAX</div>
          </div>
          <div class="content">
            <div class="greeting">Welcome to EraX!</div>
            <div class="message">Thank you for registering. Please verify your email address using the verification code below:</div>
            <div class="otp-box">${otp}</div>
            <div class="warning">
              <p class="warning-text">
                <strong>⚠️ Important:</strong><br>
                • This code will expire in 10 minutes<br>
                • Do not share this code with anyone
              </p>
            </div>
            <div class="message" style="font-size: 14px; color: #64748b;">
              If you didn't request this code, please ignore this email.
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

  try {
    await otpTransporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully to:', to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send OTP email to:', to);
    console.error('Error:', error.message);
    return false;
  }
};

export default sendOTPEmail;