# ⚡ Google OAuth + Firebase Configuration Checklist

## 🎯 Configuration Matrix - Check Each Item

### 1️⃣ Firebase Console Settings

**Location**: [Firebase Console](https://console.firebase.google.com) → Your Project

#### A. Authorized Domains
**Path**: Authentication → Settings → Authorized domains

- [ ] `localhost`
- [ ] `127.0.0.1`
- [ ] `reality-auditor.firebaseapp.com`
- [ ] `reality-auditor.web.app`
- [ ] `reality-auditor.vercel.app`
- [ ] `realityauditor.com`
- [ ] `www.realityauditor.com`
- [ ] Any preview URLs (e.g., `reality-auditor-xxxxx.vercel.app`)

#### B. Google Sign-in Provider
**Path**: Authentication → Sign-in method → Google

- [ ] Status: **Enabled** ✅
- [ ] Web SDK configuration:
  - [ ] Web client ID: `________________` (paste from Google Cloud)
  - [ ] Web client secret: `________________` (optional, but recommended)

### 2️⃣ Google Cloud Console Settings

**Location**: [Google Cloud Console](https://console.cloud.google.com) → Your Project

#### A. OAuth 2.0 Client ID Configuration
**Path**: APIs & Services → Credentials → OAuth 2.0 Client IDs → Web application

##### Authorized JavaScript Origins
Add ALL of these:
- [ ] `http://localhost`
- [ ] `http://localhost:3000`
- [ ] `http://127.0.0.1`
- [ ] `http://127.0.0.1:3000`
- [ ] `https://reality-auditor.firebaseapp.com`
- [ ] `https://reality-auditor.web.app`
- [ ] `https://reality-auditor.vercel.app`
- [ ] `https://realityauditor.com`
- [ ] `https://www.realityauditor.com`

##### Authorized Redirect URIs
Add ALL of these:
- [ ] `http://localhost/__/auth/handler`
- [ ] `http://localhost:3000/__/auth/handler`
- [ ] `http://127.0.0.1/__/auth/handler`
- [ ] `http://127.0.0.1:3000/__/auth/handler`
- [ ] `https://reality-auditor.firebaseapp.com/__/auth/handler`
- [ ] `https://reality-auditor.web.app/__/auth/handler`
- [ ] `https://reality-auditor.vercel.app/__/auth/handler`
- [ ] `https://realityauditor.com/__/auth/handler`
- [ ] `https://www.realityauditor.com/__/auth/handler`

#### B. API Enablement
**Path**: APIs & Services → Library

Enable these APIs:
- [ ] **Identity Toolkit API**
- [ ] **Google+ API** (legacy but sometimes needed)
- [ ] **Firebase Authentication API**

#### C. OAuth Consent Screen
**Path**: APIs & Services → OAuth consent screen

- [ ] Publishing status: **Production** (not Testing)
- [ ] Authorized domains includes all your domains
- [ ] Application name: Reality Auditor

### 3️⃣ Environment Variables (.env.local)

Verify these match EXACTLY with Firebase Console values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=________________
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=reality-auditor.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reality-auditor
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=reality-auditor.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=________________
NEXT_PUBLIC_FIREBASE_APP_ID=________________
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=________________
```

### 4️⃣ Common Gotchas to Check

- [ ] **Project Match**: Google Cloud project ID matches Firebase project ID
- [ ] **Client ID Copy**: The exact Client ID from Google Cloud is pasted in Firebase
- [ ] **No Spaces**: No trailing spaces in Client ID or environment variables
- [ ] **Protocol Match**: HTTP for localhost, HTTPS for production domains
- [ ] **Handler Path**: The `/__/auth/handler` path is exact (two underscores)

### 5️⃣ Testing Steps

1. **Clear Everything**:
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   // Clear cookies for your domain
   ```

2. **Test Locally First**:
   - Visit `http://localhost:3000/login`
   - Click Google Sign-in
   - Check browser console for exact error

3. **Test Production**:
   - Visit `https://reality-auditor.vercel.app/login`
   - Try Google Sign-in
   - Note any different errors

### 6️⃣ Debug Information to Collect

When you get the error, check:

1. **Browser Console**:
   - Full error object
   - Any CORS errors
   - Network tab for failed requests

2. **OAuth Flow**:
   - Does Google login window appear?
   - Does it redirect back to your app?
   - Where exactly does it fail?

### 🚨 If All Else Fails

1. **Create New OAuth Client**:
   - Sometimes it's faster to create a fresh OAuth client
   - Make sure it's in the same project as Firebase

2. **Check Firebase Project Settings**:
   - Settings → General → Your apps → Web app
   - Verify the config matches your .env.local

3. **Test with Firebase Demo**:
   - Try Firebase's official demo to ensure your Google account works
   - https://fir-ui-demo-84a6c.firebaseapp.com/

---

## ✅ Quick Verification Script

After configuring everything, run this in your browser console:

```javascript
// Check Firebase config
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

// Test OAuth redirect
const testUrl = `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/auth/handler`;
console.log('OAuth handler URL:', testUrl);

// Current domain
console.log('Current domain:', window.location.hostname);
```

---

## 📋 Copy-Paste Templates

### For Google Cloud Console Description:
```
Reality Auditor - AI-powered media bias detection
OAuth for Firebase Authentication
Production domains: realityauditor.com, reality-auditor.vercel.app
```

### For Firebase Google Provider Config:
```
Project: reality-auditor
Auth Domain: reality-auditor.firebaseapp.com
Client ID: [paste from Google Cloud Console]
```
