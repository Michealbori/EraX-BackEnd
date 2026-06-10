import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

console.log("\n🚀 EraX Email Test Suite");
console.log("=".repeat(60));

// Use hardcoded credentials
const EMAIL_USER = "deckardshawn01@gmail.com";
const EMAIL_PASS = "olraqklfiieqekwn";

console.log("\n📧 Testing Email Connection...\n");
console.log("From:", EMAIL_USER);
console.log("To: erax000000@gmail.com");
console.log("");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Connection FAILED:", error.message);
  } else {
    console.log("✅ Connection SUCCESSFUL!");
    console.log("📧 Server is ready to send emails\n");
    
    console.log("📤 Sending test email...\n");
    
    transporter.sendMail({
      from: `"EraX Test" <${EMAIL_USER}>`,
      to: "erax000000@gmail.com",
      subject: "🔐 EraX Email Test",
      text: "Test email from EraX backend",
      html: `<div style="padding:20px;background:#0a111c;color:#e2e8f0;border-radius:8px;"><h2 style="color:#f3ba2f;">✅ Email Test Successful!</h2><p>Your EraX email system is working!</p></div>`
    }, (err, info) => {
      if (err) {
        console.log("❌ Failed:", err.message);
      } else {
        console.log("✅ Email SENT!");
        console.log("📬 Check: erax000000@gmail.com");
      }
      process.exit(0);
    });
  }
});