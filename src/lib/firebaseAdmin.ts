import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';

// Load from .env for development or FIREBASE_ADMIN_KEY for production
function getPrivateKey() {
  if (process.env.FIREBASE_ADMIN_KEY) {
    return JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  }
  
  return {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  };
}

export function initFirebaseAdmin(): App {
  const apps = getApps();
  
  if (apps.length > 0) {
    return apps[0];
  }

  const privateKey = getPrivateKey();
  
  return initializeApp({
    credential: cert(privateKey)
  });
}
