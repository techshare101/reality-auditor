// Run this script to force sync Pro status for a user
// Usage: node scripts/force-sync-pro-status.js <email> [userId]

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function forceSyncProStatus(email, userId) {
  console.log('🔄 Force syncing Pro status...');
  console.log(`📧 Email: ${email}`);
  console.log(`🆔 User ID: ${userId || 'Will be fetched'}`);

  try {
    // If no userId provided, try to find it from users collection
    if (!userId) {
      const usersQuery = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!usersQuery.empty) {
        userId = usersQuery.docs[0].id;
        console.log(`✅ Found userId: ${userId}`);
      } else {
        console.log('⚠️  No user found with that email in users collection');
        console.log('    Will update by email only');
      }
    }

    const subscriptionData = {
      plan: 'pro',
      planType: 'pro', // Support both field names
      status: 'active',
      auditsLimit: 999999, // Unlimited
      auditsUsed: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      forceSynced: true,
      syncedAt: new Date().toISOString()
    };

    // Update by email
    const emailRef = db.collection('subscriptions').doc(email);
    await emailRef.set(subscriptionData, { merge: true });
    console.log(`✅ Updated subscription for email: ${email}`);

    // Update by userId if available
    if (userId) {
      const uidRef = db.collection('subscriptions').doc(userId);
      await uidRef.set({
        ...subscriptionData,
        linkedEmail: email
      }, { merge: true });
      console.log(`✅ Updated subscription for UID: ${userId}`);

      // Also update usage collection
      const usageRef = db.collection('usage').doc(userId);
      await usageRef.set({
        audits_used: 0,
        audit_limit: 999999,
        plan: 'pro',
        subscription_active: true,
        last_reset: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`✅ Updated usage collection for UID: ${userId}`);
    }

    console.log('\n🎉 Pro status force synced successfully!');
    console.log('   The user should now see the glowing Pro banner.');
    console.log('   If not, have them logout and login again.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const email = args[0];
const userId = args[1];

if (!email) {
  console.log('Usage: node scripts/force-sync-pro-status.js <email> [userId]');
  console.log('Example: node scripts/force-sync-pro-status.js valentin2k2000@gmail.com');
  process.exit(1);
}

forceSyncProStatus(email, userId).then(() => process.exit(0));
