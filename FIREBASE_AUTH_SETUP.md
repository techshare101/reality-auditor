# 🔥 Firebase Auth Setup Guide

## The Problem
You're getting `Firebase: Error (auth/configuration-not-found)` when trying to sign up. This means Firebase Auth isn't properly configured in your Firebase Console.

## 🛠️ Step-by-Step Fix

### 1. Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **reality-auditor**
3. Go to **Authentication** in the left sidebar

### 2. Enable Authentication
1. Click **Get Started** if you haven't set up Auth yet
2. Go to **Sign-in method** tab
3. Enable the following providers:

#### Enable Email/Password
1. Click on **Email/Password**
2. Toggle **Enable** to ON
3. Click **Save**

#### Enable Google Sign-In
1. Click on **Google**
2. Toggle **Enable** to ON
3. Add your **Project support email**
4. Click **Save**

### 3. Configure Authorized Domains
1. Still in **Sign-in method**, scroll down to **Authorized domains**
2. Make sure these domains are added:
   - `localhost` (for development)
   - `reality-auditor-g0pnkiggw-valentin2v2000s-projects.vercel.app` (your production domain)
   
3. If they're not there, click **Add domain** and add them

### 4. Set Up OAuth Consent Screen (for Google Sign-In)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Fill out required fields:
   - **App name**: Reality Auditor
   - **User support email**: Your email
   - **Developer contact information**: Your email

### 5. Verify Firebase Configuration
After the debug component loads, check if all config values show ✅ Present.

### 6. Test the Setup
1. Go to your app: http://localhost:3000/register
2. Try creating an account with email/password
3. Try Google sign-in

## 🐛 Troubleshooting

### Still Getting Configuration Error?
1. **Double-check Project ID**: Make sure `reality-auditor` is correct
2. **Refresh Firebase Config**: Go to Project Settings → General → Web apps → Click the gear icon → Copy the new config
3. **Check API Keys**: Make sure your API key is correct in `.env.local`

### Google Sign-In Issues?
1. Make sure OAuth consent screen is configured
2. Add your domain to authorized domains
3. Wait a few minutes for changes to propagate

### Debug Information
The debug panel (bottom-right corner of your app) will show:
- ✅ All config values present
- ✅ Auth initialized
- Current auth state

## 🎯 Expected Result

After fixing:
1. Email signup should work without errors
2. Google sign-in should work
3. Users should be redirected to `/dashboard`
4. Debug panel shows all ✅ green checkmarks

## 🚨 Common Issues

1. **Wrong Project ID**: Make sure you're in the correct Firebase project
2. **Auth Not Enabled**: Authentication service must be enabled
3. **Missing Authorized Domains**: localhost and your production domain must be added
4. **API Key Restrictions**: Make sure your API key allows Firebase Auth

Let me know what the debug panel shows and I can help diagnose further!
