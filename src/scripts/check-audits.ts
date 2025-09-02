import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function checkAudits() {
  console.log('🔍 Checking audits in Firestore...\n');

  try {
    // Initialize Firebase Admin
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      console.error('❌ FIREBASE_SERVICE_ACCOUNT_PATH not found in .env.local');
      process.exit(1);
    }

    const serviceAccount = require(serviceAccountPath);
    
    initializeApp({
      credential: cert(serviceAccount)
    });

    const db = getFirestore();
    
    // Get all audits
    console.log('📊 Fetching all audits...');
    const auditsSnapshot = await db.collection('audits').get();
    console.log(`\n✅ Total audits in database: ${auditsSnapshot.size}`);

    if (auditsSnapshot.size === 0) {
      console.log('\n⚠️  No audits found in the database.');
      console.log('This explains why Recent Audits is empty.');
      console.log('\nPossible reasons:');
      console.log('1. Audits are being saved to a different collection');
      console.log('2. The save operation is failing silently');
      console.log('3. Audits are being deleted after creation');
      return;
    }

    // Group audits by userId
    const auditsByUser: Record<string, any[]> = {};
    auditsSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = data.userId || 'no-user-id';
      if (!auditsByUser[userId]) {
        auditsByUser[userId] = [];
      }
      auditsByUser[userId].push({
        id: doc.id,
        createdAt: data.createdAt,
        url: data.url,
        hasResult: !!data.result,
        hasMetadata: !!data.metadata
      });
    });

    console.log(`\n👥 Audits grouped by user (${Object.keys(auditsByUser).length} users):`);
    for (const [userId, audits] of Object.entries(auditsByUser)) {
      console.log(`\n  User: ${userId}`);
      console.log(`  Total audits: ${audits.length}`);
      
      // Show last 3 audits
      const recentAudits = audits
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3);
      
      recentAudits.forEach((audit, index) => {
        const date = audit.createdAt?.toDate?.() || audit.createdAt || 'No date';
        console.log(`    ${index + 1}. ID: ${audit.id}`);
        console.log(`       Created: ${date}`);
        console.log(`       URL: ${audit.url || 'No URL'}`);
        console.log(`       Has result: ${audit.hasResult}`);
        console.log(`       Has metadata: ${audit.hasMetadata}`);
      });
    }

    // Check for index requirements
    console.log('\n📋 Index Requirements:');
    console.log('The RecentAuditsCard component requires a composite index:');
    console.log('  Collection: audits');
    console.log('  Fields: userId (Ascending), createdAt (Descending)');
    console.log('\nIf you see an index error in the browser console, create this index in the Firebase Console.');

  } catch (error) {
    console.error('❌ Error checking audits:', error);
  }
}

checkAudits();
