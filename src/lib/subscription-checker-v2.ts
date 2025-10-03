import { db } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface SubscriptionStatus {
  isActive: boolean;
  planType: 'free' | 'pro';
  auditsUsed: number;
  auditsLimit: number;
  auditsRemaining: number;
  subscriptionStatus: string;
  currentPeriodEnd?: Date;
  reason?: string;
}

export interface UsageUpdateResult {
  success: boolean;
  newUsageCount: number;
  auditsRemaining: number;
  error?: string;
}

/**
 * Check if user can perform an audit based on their subscription
 * Uses profiles collection as single source of truth
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    // Check profiles collection for subscription status
    const profileDoc = await db.collection('profiles').doc(userId).get();
    const usageDoc = await db.collection('usage').doc(userId).get();
    
    // Default to free if no profile exists
    const subscriptionStatus = profileDoc.exists ? 
      (profileDoc.data()?.subscription_status || 'free') : 'free';
    
    // Check if user is Pro (subscription_status is 'active' or 'pro')
    const isPro = subscriptionStatus === 'active' || subscriptionStatus === 'pro';
    
    // Get current usage
    const auditsUsed = usageDoc.exists ? (usageDoc.data()?.audits_used || 0) : 0;
    
    // Pro users have unlimited audits
    if (isPro) {
      return {
        isActive: true,
        planType: 'pro',
        auditsUsed,
        auditsLimit: 999999, // Effectively unlimited
        auditsRemaining: 999999,
        subscriptionStatus: 'active',
        currentPeriodEnd: profileDoc.data()?.current_period_end?.toDate(),
      };
    }
    
    // Free users have 5 audits per month
    const auditsLimit = 5;
    const auditsRemaining = Math.max(0, auditsLimit - auditsUsed);
    
    return {
      isActive: auditsRemaining > 0,
      planType: 'free',
      auditsUsed,
      auditsLimit,
      auditsRemaining,
      subscriptionStatus: 'free',
      reason: auditsRemaining === 0 ? 'Monthly limit reached. Upgrade to Pro for unlimited audits.' : undefined
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);
    
    // Fallback to free plan on error
    return {
      isActive: true,
      planType: 'free',
      auditsUsed: 0,
      auditsLimit: 5,
      auditsRemaining: 5,
      subscriptionStatus: 'error',
      reason: 'Error checking subscription - defaulting to free plan'
    };
  }
}

/**
 * Increment usage count after successful audit
 */
export async function incrementUsage(userId: string): Promise<UsageUpdateResult> {
  try {
    const usageRef = db.collection('usage').doc(userId);
    const profileDoc = await db.collection('profiles').doc(userId).get();
    
    // Check if user is Pro (active subscription)
    const isPro = profileDoc.exists && 
      (profileDoc.data()?.subscription_status === 'active' || profileDoc.data()?.subscription_status === 'pro');
    
    // Pro users don't need usage tracking
    if (isPro) {
      return {
        success: true,
        newUsageCount: 0,
        auditsRemaining: 999999,
      };
    }
    
    // Use transaction for atomic increment
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(usageRef);
      
      const currentUsage = doc.exists ? (doc.data()?.audits_used || 0) : 0;
      
      // Check limit for free users
      if (currentUsage >= 5) {
        return {
          success: false,
          newUsageCount: currentUsage,
          auditsRemaining: 0,
          error: 'Monthly limit reached'
        };
      }
      
      // Increment usage
      const newUsage = currentUsage + 1;
      
      if (doc.exists) {
        transaction.update(usageRef, {
          audits_used: newUsage,
          updated_at: Timestamp.now(),
        });
      } else {
        transaction.set(usageRef, {
          audits_used: newUsage,
          plan: 'free',
          audit_limit: 5,
          last_reset: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }
      
      return {
        success: true,
        newUsageCount: newUsage,
        auditsRemaining: Math.max(0, 5 - newUsage),
      };
    });
    
    return result;
    
  } catch (error) {
    console.error('Error incrementing usage:', error);
    
    return {
      success: false,
      newUsageCount: 0,
      auditsRemaining: 0,
      error: 'Failed to update usage count'
    };
  }
}

/**
 * Reset usage count (called by webhook on subscription renewal)
 */
export async function resetUsage(userId: string): Promise<boolean> {
  try {
    await db.collection('usage').doc(userId).set({
      audits_used: 0,
      last_reset: Timestamp.now(),
      updated_at: Timestamp.now(),
    }, { merge: true });
    
    console.log(`✅ Reset usage count for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error('Error resetting usage:', error);
    return false;
  }
}

/**
 * Get subscription summary for dashboard display
 */
export async function getSubscriptionSummary(userId: string) {
  const status = await checkSubscriptionStatus(userId);
  
  return {
    ...status,
    usagePercentage: status.auditsLimit > 0 ? (status.auditsUsed / status.auditsLimit) * 100 : 0,
    isNearLimit: status.planType === 'free' && status.auditsRemaining <= 1,
    planDisplayName: status.planType === 'pro' ? 'Pro Plan' : 'Free Plan',
  };
}