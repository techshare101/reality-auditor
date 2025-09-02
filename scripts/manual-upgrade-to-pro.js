const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function manualUpgradeToPro(userId) {
  try {
    console.log(`🚀 Manually upgrading user ${userId} to Pro plan...`);
    
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const currentPeriodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    
    // Update subscription document
    await db.collection('subscriptions').doc(userId).set({
      planType: 'pro',
      status: 'active',
      auditsLimit: 999999, // Unlimited (large number)
      auditsUsed: 0,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(monthStart),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(currentPeriodEnd),
      updatedAt: admin.firestore.Timestamp.now(),
    }, { merge: true });
    
    // Update usage document
    await db.collection('usage').doc(userId).set({
      audits_used: 0,
      audit_limit: 999999, // Unlimited (large number)
      plan: 'pro',
      last_reset: admin.firestore.Timestamp.now(),
      subscription_active: true,
      billing_cycle_start: monthStart.toISOString(),
      billing_cycle_end: currentPeriodEnd.toISOString(),
    }, { merge: true });
    
    console.log(`✅ Successfully upgraded user ${userId} to Pro plan with unlimited audits!`);
    
    // Verify the update
    const subDoc = await db.collection('subscriptions').doc(userId).get();
    const usageDoc = await db.collection('usage').doc(userId).get();
    
    console.log('\n📊 Subscription data:', subDoc.data());
    console.log('\n📊 Usage data:', usageDoc.data());
    
  } catch (error) {
    console.error('❌ Error upgrading user:', error);
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a userId as argument');
  console.log('Usage: node manual-upgrade-to-pro.js <userId>');
  process.exit(1);
}

// Run the upgrade
manualUpgradeToPro(userId).then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
});
