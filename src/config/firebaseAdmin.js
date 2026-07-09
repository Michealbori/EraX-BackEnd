import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔥 ===== FIREBASE ADMIN INITIALIZATION =====');

// ✅ Load from JSON file
const jsonKeyPath = path.join(__dirname, 'firebase-admin.json');

if (!fs.existsSync(jsonKeyPath)) {
  console.error('\n❌ Firebase credentials file not found!');
  console.error('📍 Expected location:', jsonKeyPath);
  console.error('\n📝 Steps to fix:');
  console.error('  1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('  2. Click "Generate new private key"');
  console.error('  3. Download the JSON file');
  console.error('  4. Save it as: src/config/firebase-admin.json');
  console.error('=========================================\n');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(jsonKeyPath, 'utf8'));
  
  console.log('✅ Loading Firebase credentials from JSON file...');
  console.log('📧 Project ID:', serviceAccount.project_id);
  console.log('👤 Client Email:', serviceAccount.client_email);
  
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('\n✅ Firebase Admin SDK initialized successfully!');
  console.log('=========================================\n');
  
} catch (error) {
  console.error('\n❌ Failed to load Firebase credentials:', error.message);
  console.error('\n🔍 Make sure:');
  console.error('  1. The JSON file is valid');
  console.error('  2. The file is saved at: src/config/firebase-admin.json');
  console.error('  3. The private key is complete and not corrupted');
  console.error('=========================================\n');
  process.exit(1);
}

export default admin;