import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase Admin with base64 credentials
let adminApp;
if (!getApps().length) {
  try {
    // Check for base64 credentials first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
      console.log('📋 Using Firebase service account key from base64');
      const decodedCreds = Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
        'base64'
      ).toString('utf-8');
      const serviceAccount = JSON.parse(decodedCreds);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        ...firebaseAdminConfig
      });
      console.log('✅ Firebase Admin initialized with base64 service account');
    }
    // Fallback to JSON credentials
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('📋 Using Firebase service account key from environment');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        ...firebaseAdminConfig
      });
      console.log('✅ Firebase Admin initialized with service account');
    }
    // Development fallback
    else if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Creating minimal Firebase Admin app for development');
      adminApp = initializeApp({
        projectId: firebaseAdminConfig.projectId,
      });
      console.log('⚠️ Firebase Admin running in limited mode (no credentials)');
    }
    else {
      throw new Error('No Firebase credentials available');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error instanceof Error ? error.message : String(error));
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Falling back to minimal development app');
      adminApp = initializeApp({
        projectId: firebaseAdminConfig.projectId,
      });
      console.log('⚠️ Firebase Admin running in limited mode (no credentials)');
    } else {
      throw error;
    }
  }
} else {
  adminApp = getApps()[0];
  console.log('♻️ Reusing existing Firebase Admin app');
}

// Export Firebase Admin services
export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
export default adminApp;
