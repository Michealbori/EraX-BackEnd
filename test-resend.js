import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('\n🔍 ===== TESTING RESEND API =====');
console.log('API Key loaded:', process.env.RESEND_API_KEY ? '✅ YES' : '❌ NO');
console.log('Key starts with:', process.env.RESEND_API_KEY?.substring(0, 15) || 'N/A');
console.log('Key length:', process.env.RESEND_API_KEY?.length || 0);
console.log('==============================\n');

console.log(' Sending test email...');

try {
  const data = await resend.emails.send({
    from: 'EraX <onboarding@resend.dev>',
    to: ['deckardshawn01@gmail.com'],
    subject: 'Test Email from EraX',
    html: '<h1>This is a test email</h1><p>If you received this, Resend is working!</p>'
  });
  
  console.log('\n✅ SUCCESS!');
  console.log('Email sent:', data);
  console.log('Message ID:', data?.id);
  console.log('\n==============================\n');
} catch (error) {
  console.error('\n❌ FAILED!');
  console.error('Error:', error.message);
  console.error('Full error:', error);
  console.log('\n==============================\n');
}