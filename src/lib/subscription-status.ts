import { db } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface SubscriptionData {
  plan: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'past_due' | 'free';
  auditsLimit?: number;
  auditsUsed?: number;
  stripeCustomerId?: string;
  updatedAt?: any;
}

/**
 * Check if a user has a Pro subscription
 * Checks both by userId and email to handle different webhook patterns
 */
export async function hasPaidPlan(userId: string, userEmail?: string): Promise<boolean> {
  try {
    console.log(`🔍 Checking paid plan for user ${userId} (${userEmail || 'no email'})`);
    
    // First, check by userId (existing pattern)
    const userSubRef = db.collection('subscriptions').doc(userId);
    const userSubDoc = await userSubRef.get();
    
    if (userSubDoc.exists) {
      const data = userSubDoc.data() as SubscriptionData;
      const isPro = data.plan === 'pro' && data.status === 'active';
      console.log(`✅ Found subscription by userId: ${data.plan} (${data.status})`);
      return isPro;
    }
    
    // If no subscription by userId and we have email, check by email
    if (userEmail) {
      const emailSubRef = db.collection('subscriptions').doc(userEmail);
      const emailSubDoc = await emailSubRef.get();
      
      if (emailSubDoc.exists) {
        const data = emailSubDoc.data() as SubscriptionData;
        const isPro = data.plan === 'pro' && data.status === 'active';
        console.log(`✅ Found subscription by email: ${data.plan} (${data.status})`);
        
        // Migrate subscription to userId for consistency
        if (isPro) {
          console.log(`🔄 Migrating subscription from email to userId...`);
          await userSubRef.set({
            ...data,
            migratedFrom: userEmail,
            updatedAt: Timestamp.now()
          }, { merge: true });
        }
        
        return isPro;
      }
    }
    
    // Check users collection as fallback
    const usersQuery = await db.collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get();
    
    if (!usersQuery.empty) {
      const userData = usersQuery.docs[0].data();
      if (userData.isPro === true || userData.plan === 'pro') {
        console.log(`✅ Found Pro status in users collection`);
        
        // Create subscription document for consistency
        await userSubRef.set({
          plan: 'pro',
          status: 'active',
          auditsLimit: 999999, // Unlimited
          auditsUsed: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          source: 'users_collection_migration'
        }, { merge: true });
        
        return true;
      }
    }
    
    console.log(`❌ No paid plan found for ${userId}/${userEmail}`);
    return false;
    
  } catch (error) {
    console.error('❌ Error checking paid plan:', error);
    return false;
  }
}

/**
 * Get detailed subscription status
 */
export async function getSubscriptionStatus(userId: string, userEmail?: string) {
  try {
    // Check by userId first
    const userSubRef = db.collection('subscriptions').doc(userId);
    const userSubDoc = await userSubRef.get();
    
    if (userSubDoc.exists) {
      const data = userSubDoc.data() as SubscriptionData;
      return {
        hasPaidPlan: data.plan === 'pro' && data.status === 'active',
        plan: data.plan || 'free',
        status: data.status || 'free',
        auditsLimit: data.auditsLimit || (data.plan === 'pro' ? 999999 : 5),
        auditsUsed: data.auditsUsed || 0,
        source: 'userId'
      };
    }
    
    // Check by email if provided
    if (userEmail) {
      const emailSubRef = db.collection('subscriptions').doc(userEmail);
      const emailSubDoc = await emailSubRef.get();
      
      if (emailSubDoc.exists) {
        const data = emailSubDoc.data() as SubscriptionData;
        const status = {
          hasPaidPlan: data.plan === 'pro' && data.status === 'active',
          plan: data.plan || 'free',
          status: data.status || 'free',
          auditsLimit: data.auditsLimit || (data.plan === 'pro' ? 999999 : 5),
          auditsUsed: data.auditsUsed || 0,
          source: 'email'
        };
        
        // Migrate to userId-based document
        if (status.hasPaidPlan) {
          await userSubRef.set({
            ...data,
            migratedFrom: userEmail,
            updatedAt: Timestamp.now()
          }, { merge: true });
        }
        
        return status;
      }
    }
    
    // Default free plan
    return {
      hasPaidPlan: false,
      plan: 'free' as const,
      status: 'free' as const,
      auditsLimit: 5,
      auditsUsed: 0,
      source: 'default'
    };
    
  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    return {
      hasPaidPlan: false,
      plan: 'free' as const,
      status: 'free' as const,
      auditsLimit: 5,
      auditsUsed: 0,
      source: 'error'
    };
  }
}

/**
 * Update subscription status (for admin/webhook use)
 */
export async function updateSubscriptionStatus(
  identifier: string, // Can be userId or email
  updates: Partial<SubscriptionData>
) {
  try {
    const docRef = db.collection('subscriptions').doc(identifier);
    await docRef.set({
      ...updates,
      updatedAt: Timestamp.now()
    }, { merge: true });
    
    console.log(`✅ Updated subscription for ${identifier}:`, updates);
    return true;
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    return false;
  }
}
