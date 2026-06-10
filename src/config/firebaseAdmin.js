import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Try to locate the service account key
  const serviceAccountPath = join(__dirname, '../../firebase-service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  // Initialize Firebase Admin
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  console.log('[SECURITY MATRIX]: Firebase Admin SDK authorized.');
} catch (error) {
  console.error('[SECURITY ERROR]: Failed to initialize Firebase Admin:', error.message);
  console.warn('[FALLBACK]: Firebase Admin features will be disabled.');
}

export default admin;