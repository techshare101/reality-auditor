import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Firebase Admin configuration
const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Initialize Firebase Admin with multiple fallback strategies
let adminApp;
if (!getApps().length) {
  try {
    // Strategy 1: Try service account key from environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('📋 Using Firebase service account key from environment');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        ...firebaseAdminConfig
      });
      console.log('✅ Firebase Admin initialized with service account');
    } 
    // Strategy 2: Try Application Default Credentials (for local gcloud login)
    else {
      console.log('🔑 Attempting to use Application Default Credentials');
      adminApp = initializeApp({
        credential: applicationDefault(),
        ...firebaseAdminConfig
      });
      console.log('✅ Firebase Admin initialized with Application Default Credentials');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error instanceof Error ? error.message : String(error));
    console.log('🔧 Creating minimal Firebase Admin app for development');
    
    // Strategy 3: Minimal config for development (limited functionality)
    try {
      adminApp = initializeApp({
        projectId: firebaseAdminConfig.projectId,
      });
      console.log('⚠️ Firebase Admin running in limited mode (no credentials)');
    } catch (fallbackError) {
      console.error('💥 Complete Firebase Admin initialization failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
      throw new Error('Unable to initialize Firebase Admin SDK');
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
