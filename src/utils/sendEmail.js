import { otpTransporter } from '../config/email.js';

export const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: `"EraX Security" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '🔐 EraX - Verify Your Identity',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>EraX Email Verification</title>
        <!--[if mso]>
        <noscript>
          <xml>
            <o:OfficeDocumentSettings>
              <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
        </noscript>
        <![endif]-->
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased;">
        
        <!-- Email Wrapper -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0e1a; padding: 40px 20px;">
          <tr>
            <td align="center">
              
              <!-- Main Container -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); border: 1px solid #2a3142;">
                
                <!-- Header Section -->
                <tr>
                  <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #1e2538 0%, #0f1419 100%); border-bottom: 2px solid #f3ba2f;">
                    <!-- Logo -->
                    <div style="margin-bottom: 10px;">
                      <span style="font-size: 42px; font-weight: 900; color: #f3ba2f; letter-spacing: 3px; text-shadow: 0 2px 10px rgba(243, 186, 47, 0.3);">ERA</span>
                      <span style="font-size: 42px; font-weight: 900; color: #ffffff; letter-spacing: 3px;">X</span>
                    </div>
                    <div style="font-size: 11px; color: #8b95a5; letter-spacing: 4px; text-transform: uppercase; margin-top: 8px;">
                      Secure Identity Verification
                    </div>
                  </td>
                </tr>

                <!-- Security Badge -->
                <tr>
                  <td style="padding: 25px 40px 0 40px; text-align: center;">
                    <div style="display: inline-block; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 50px; padding: 8px 20px; font-size: 12px; color: #4ade80; font-weight: 600; letter-spacing: 1px;">
                      🔒 ENCRYPTED & SECURE
                    </div>
                  </td>
                </tr>

                <!-- Content Section -->
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

                <!-- OTP Code Box -->
                <tr>
                  <td style="padding: 10px 40px 30px 40px;">
                    <div style="background: linear-gradient(135deg, #f3ba2f 0%, #f59e0b 50%, #d97706 100%); border-radius: 16px; padding: 35px 20px; text-align: center; box-shadow: 0 10px 40px rgba(243, 186, 47, 0.4); position: relative; overflow: hidden;">
                      <!-- Decorative Elements -->
                      <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;"></div>
                      <div style="position: absolute; bottom: -30px; left: -30px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;"></div>
                      
                      <!-- OTP Label -->
                      <div style="font-size: 11px; color: #0f1419; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 15px; opacity: 0.8;">
                        Your Verification Code
                      </div>
                      
                      <!-- OTP Code -->
                      <div style="font-size: 52px; font-weight: 900; color: #0f1419; letter-spacing: 12px; font-family: 'Courier New', monospace; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">
                        ${otp}
                      </div>
                      
                      <!-- Expiry Timer -->
                      <div style="margin-top: 20px; font-size: 12px; color: #0f1419; font-weight: 600; opacity: 0.9;">
                        ⏱️ Expires in 10 minutes
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Security Warning Box -->
                <tr>
                  <td style="padding: 0 40px 25px 40px;">
                    <div style="background: rgba(239, 68, 68, 0.08); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
                      <div style="font-size: 14px; font-weight: 700; color: #ef4444; margin-bottom: 10px; display: flex; align-items: center;">
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

                <!-- Help Section -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <div style="background: rgba(59, 130, 246, 0.08); border-radius: 12px; padding: 20px; text-align: center;">
                      <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                        <strong style="color: #60a5fa;">Need help?</strong> Contact our support team at<br/>
                        <a href="mailto:support@erax.company" style="color: #f3ba2f; text-decoration: none; font-weight: 600;">support@erax.company</a>
                      </div>
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <div style="height: 1px; background: linear-gradient(90deg, transparent, #2a3142, transparent);"></div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 30px 40px 40px 40px; text-align: center;">
                    <div style="font-size: 12px; color: #64748b; line-height: 1.8;">
                      <div style="margin-bottom: 10px;">
                        © ${new Date().getFullYear()} EraX. All rights reserved.
                      </div>
                      <div style="font-size: 11px; color: #475569;">
                        This is an automated message. Please do not reply to this email.
                      </div>
                      <div style="margin-top: 15px; font-size: 11px; color: #475569;">
                        If you didn't request this verification, you can safely ignore this email.
                      </div>
                    </div>
                  </td>
                </tr>

              </table>
              <!-- End Main Container -->

              <!-- Email Client Note -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; margin-top: 20px;">
                <tr>
                  <td style="text-align: center; font-size: 11px; color: #475569; padding: 0 20px;">
                    Having trouble viewing this email? Make sure to enable images in your email client.
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
        <!-- End Email Wrapper -->

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