import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔍 Testing .env file loading...\n');
console.log('Current directory:', __dirname);
console.log('Looking for .env in:', path.join(__dirname, '..'));

// Load .env
const result = dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (result.error) {
  console.log('\n❌ ERROR loading .env:', result.error.message);
} else {
  console.log('\n✅ .env loaded successfully!');
  console.log('\nEnvironment variables:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `✓ Set (${process.env.EMAIL_PASS.length} chars)` : '✗ EMPTY');
  console.log('EMAIL_PASS raw value:', process.env.EMAIL_PASS);
  console.log('DEPOSIT_EMAIL_USER:', process.env.DEPOSIT_EMAIL_USER);
  console.log('DEPOSIT_EMAIL_PASS:', process.env.DEPOSIT_EMAIL_PASS ? `✓ Set (${process.env.DEPOSIT_EMAIL_PASS.length} chars)` : '✗ EMPTY');
}

process.exit(0);