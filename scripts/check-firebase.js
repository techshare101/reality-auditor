/**
 * Firebase Project Diagnostic Script
 * Run: node scripts/check-firebase.js
 */

require('dotenv').config({ path: '.env.local' });

async function checkFirebaseProject() {
  console.log('🔍 Firebase Project Diagnostic...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('✅ NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : '❌ Missing');
  console.log('✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '❌ Missing');
  console.log('✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '❌ Missing');
  console.log();

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    console.log('❌ Missing Firebase configuration in .env.local');
    return;
  }

  console.log(`🎯 Testing Firebase Project: ${projectId}`);
  console.log(`🔑 Using API Key: ${apiKey.substring(0, 10)}...`);
  console.log();

  // Test Firebase Auth configuration
  try {
    console.log('🔐 Testing Firebase Auth configuration...');
    
    // Try to fetch project config
    const configUrl = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`;
    
    const response = await fetch(configUrl);
    
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Firebase Auth is configured');
      console.log('   Project ID:', config.projectId);
      console.log('   Auth domain:', config.authorizedDomains?.join(', ') || 'None');
      
      if (config.signIn) {
        console.log('   Available providers:');
        let providersCount = 0;
        
        if (config.signIn.allowAnonymous) {
          console.log('     ✅ Anonymous');
          providersCount++;
        }
        
        if (config.signIn.email?.enabled) {
          console.log('     ✅ Email/Password');
          providersCount++;
        }
        
        if (config.signIn.providers?.some(p => p.providerId === 'google.com')) {
          console.log('     ✅ Google Sign-in');
          providersCount++;
        }
        
        if (providersCount === 0) {
          console.log('     ❌ No sign-in providers enabled');
        }
        
        console.log(`   Total providers: ${providersCount}`);
      } else {
        console.log('   ❌ No sign-in configuration found');
      }
    } else {
      const error = await response.json();
      console.log('❌ Firebase Auth configuration error:');
      console.log('   Status:', response.status);
      console.log('   Message:', error.error?.message || 'Unknown error');
      
      if (error.error?.message === 'CONFIGURATION_NOT_FOUND') {
        console.log('\n💡 Solution:');
        console.log('1. Go to https://console.firebase.google.com/');
        console.log(`2. Select project: ${projectId}`);
        console.log('3. Go to Authentication → Get Started');
        console.log('4. Enable Sign-in method → Email/Password');
        console.log('5. Save and try again');
      }
    }

  } catch (error) {
    console.log('❌ Network error testing Firebase:', error.message);
  }

  console.log('\n📝 Manual Steps to Fix:');
  console.log('1. Open: https://console.firebase.google.com/');
  console.log(`2. Select project: ${projectId}`);
  console.log('3. Sidebar → Authentication');
  console.log('4. Click "Get Started" if you see it');
  console.log('5. Go to "Sign-in method" tab');
  console.log('6. Click "Email/Password" → Enable → Save');
  console.log('7. Test signup again in your app');
}

// Run the diagnostic
checkFirebaseProject().catch(console.error);
