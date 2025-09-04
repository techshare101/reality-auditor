# Google OAuth Configuration Guide for Reality Auditor

## Steps to Configure Google OAuth:

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Make sure you're signed in with the same Google account used for Firebase
3. Select your project from the dropdown (it should match your Firebase project name: "reality-auditor")

### 2. Navigate to OAuth Credentials
1. In the left sidebar, click on **"APIs & Services"**
2. Click on **"Credentials"**
3. Look for your OAuth 2.0 Client IDs (you should see one for Web application)

### 3. Configure OAuth Client ID
1. Click on your Web OAuth client (usually named "Web client" or similar)
2. In the **Authorized JavaScript origins** section, add ALL of these URLs:
   ```
   http://localhost
   http://localhost:3000
   http://127.0.0.1
   http://127.0.0.1:3000
   https://reality-auditor.firebaseapp.com
   https://reality-auditor.web.app
   https://realityauditor.com
   https://www.realityauditor.com
   https://reality-auditor.vercel.app
   ```

3. In the **Authorized redirect URIs** section, add:
   ```
   http://localhost:3000/api/auth/callback/google
   https://reality-auditor.firebaseapp.com/__/auth/handler
   https://reality-auditor.web.app/__/auth/handler
   https://realityauditor.com/__/auth/handler
   https://www.realityauditor.com/__/auth/handler
   https://reality-auditor.vercel.app/__/auth/handler
   ```

4. Click **"Save"**

### 4. Enable Google+ API (if not already enabled)
1. Go to **"APIs & Services"** → **"Library"**
2. Search for "Google+ API"
3. Click on it and press **"Enable"** if it's not already enabled

### 5. Check OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Make sure it's configured with:
   - App name: Reality Auditor
   - User support email: Your email
   - Authorized domains: Add all your domains
   - Developer contact: Your email

### 6. Copy Client ID and Secret (if needed)
1. Go back to **"Credentials"**
2. Click on your OAuth client
3. Copy the Client ID and Client Secret if you need them

## Common Issues and Solutions:

### Issue: "redirect_uri_mismatch"
- Make sure the redirect URI in your app matches exactly what's in Google Console
- Check for trailing slashes, http vs https, etc.

### Issue: "unauthorized_client"
- The OAuth client might be in a different project
- Check that you're using the correct Client ID

### Issue: Domain not authorized
- Double-check all domains are added to both:
  - Firebase Console (Authorized domains)
  - Google Cloud Console (Authorized JavaScript origins)

## Testing Your Configuration:
1. After saving changes, wait 5-10 minutes for propagation
2. Clear your browser cache and cookies
3. Try signing in again

## Need to Find Your Project?
If you can't find your project in Google Cloud Console:
1. Go to Firebase Console
2. Click on Project Settings (gear icon)
3. Look for "Project ID" and "Web API Key"
4. Use these to search in Google Cloud Console
