import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface SubscriptionStatus {
  isActive: boolean;
  planType: 'free' | 'basic' | 'pro' | 'enterprise';
  auditsUsed: number;
  auditsLimit: number;
  auditsRemaining: number;
  subscriptionStatus: string;
  currentPeriodEnd?: Date;
  reason?: string; // Why subscription is not active
}

export interface UsageUpdateResult {
  success: boolean;
  newUsageCount: number;
  auditsRemaining: number;
  error?: string;
}

/**
 * Check if user can perform an audit based on their subscription
 */
export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    const subscriptionRef = db.collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();

    // Compute current UTC month period boundaries
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

    if (!subscriptionDoc.exists) {
      // No subscription = treat as Free plan for this month
      return {
        isActive: true,
        planType: 'free',
        auditsUsed: 0,
        auditsLimit: 5,
        auditsRemaining: 5,
        subscriptionStatus: 'free',
        currentPeriodEnd: nextMonthStart,
        reason: 'No subscription found - using free plan limits'
      };
    }

    const subscription = subscriptionDoc.data()!;
    const currentPeriodEnd: Date | undefined = subscription.currentPeriodEnd?.toDate();

    // Determine if this is an active paid plan
    const isPaidPlan = subscription.planType && subscription.planType !== 'free' && subscription.status !== 'free';
    const isSubscriptionActive = isPaidPlan && subscription.status === 'active' && (!currentPeriodEnd || currentPeriodEnd > now);

    // For non-active or free plans, enforce Free monthly limits with monthly reset
    if (!isSubscriptionActive) {
      const storedStart: Date | undefined = subscription.currentPeriodStart?.toDate();
      const shouldReset = !storedStart ||
        storedStart.getUTCFullYear() !== monthStart.getUTCFullYear() ||
        storedStart.getUTCMonth() !== monthStart.getUTCMonth();

      let auditsUsed = subscription.auditsUsed || 0;

      // If switching to free or new month started, reset counters and align period
      if (shouldReset || subscription.planType !== 'free' || subscription.status !== 'free') {
        await subscriptionRef.set({
          planType: 'free',
          status: 'free',
          auditsLimit: 5,
          auditsUsed: 0,
          currentPeriodStart: Timestamp.fromDate(monthStart),
          currentPeriodEnd: Timestamp.fromDate(nextMonthStart),
          updatedAt: Timestamp.now(),
        }, { merge: true });
        auditsUsed = 0;
      }

      const auditsLimit = 5;
      const auditsRemaining = Math.max(0, auditsLimit - auditsUsed);

      return {
        isActive: auditsRemaining > 0,
        planType: 'free',
        auditsUsed,
        auditsLimit,
        auditsRemaining,
        subscriptionStatus: 'free',
        currentPeriodEnd: nextMonthStart,
        reason: auditsRemaining === 0 ? 'Usage limit reached for this billing period' : 'Using free plan limits',
      };
    }

    // Active paid subscription path
    const auditsUsed = subscription.auditsUsed || 0;
    const auditsLimit = subscription.auditsLimit || getDefaultLimit(subscription.planType);
    const auditsRemaining = Math.max(0, auditsLimit - auditsUsed);

    return {
      isActive: auditsRemaining > 0,
      planType: subscription.planType,
      auditsUsed,
      auditsLimit,
      auditsRemaining,
      subscriptionStatus: subscription.status,
      currentPeriodEnd,
      reason: auditsRemaining === 0 ? 'Usage limit reached for this billing period' : undefined
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);

    // Fallback to free plan on error
    const now = new Date();
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
    return {
      isActive: true,
      planType: 'free',
      auditsUsed: 0,
      auditsLimit: 5,
      auditsRemaining: 5,
      subscriptionStatus: 'error',
      currentPeriodEnd: nextMonthStart,
      reason: 'Error checking subscription - using free plan limits'
    };
  }
}

/**
 * Increment usage count after successful audit
 */
export async function incrementUsage(userId: string): Promise<UsageUpdateResult> {
  try {
    const subscriptionRef = db.collection('subscriptions').doc(userId);

    // Use transaction to prevent race conditions
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(subscriptionRef);

      // Compute current UTC month boundaries
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

      if (!doc.exists) {
        // Create subscription record for Free users starting this month
        transaction.set(subscriptionRef, {
          planType: 'free',
          status: 'free',
          auditsUsed: 1,
          auditsLimit: 5,
          currentPeriodStart: Timestamp.fromDate(monthStart),
          currentPeriodEnd: Timestamp.fromDate(nextMonthStart),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        }, { merge: true });

        return {
          success: true,
          newUsageCount: 1,
          auditsRemaining: 4,
        };
      }

      const subscription = doc.data()!;
      const isFree = subscription.planType === 'free' || subscription.status === 'free' || subscription.status !== 'active';

      let limit = isFree ? 5 : (subscription.auditsLimit || getDefaultLimit(subscription.planType));
      let currentUsage = subscription.auditsUsed || 0;

      if (isFree) {
        const storedStart: Date | undefined = subscription.currentPeriodStart?.toDate();
        const needsReset = !storedStart ||
          storedStart.getUTCFullYear() !== monthStart.getUTCFullYear() ||
          storedStart.getUTCMonth() !== monthStart.getUTCMonth();

        if (needsReset) {
          currentUsage = 0;
          transaction.set(subscriptionRef, {
            planType: 'free',
            status: 'free',
            auditsLimit: 5,
            currentPeriodStart: Timestamp.fromDate(monthStart),
            currentPeriodEnd: Timestamp.fromDate(nextMonthStart),
          }, { merge: true });
        }
      }

      // Check if user has exceeded limit
      if (currentUsage >= limit) {
        return {
          success: false,
          newUsageCount: currentUsage,
          auditsRemaining: 0,
          error: 'Usage limit exceeded'
        };
      }

      // Increment usage
      const newUsage = currentUsage + 1;
      transaction.update(subscriptionRef, {
        auditsUsed: newUsage,
        updatedAt: Timestamp.now(),
      });

      return {
        success: true,
        newUsageCount: newUsage,
        auditsRemaining: Math.max(0, limit - newUsage),
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
 * Reset usage count (typically called at start of new billing period)
 */
export async function resetUsage(userId: string): Promise<boolean> {
  try {
    await db.collection('subscriptions').doc(userId).update({
      auditsUsed: 0,
      updatedAt: Timestamp.now(),
    });
    
    console.log(`✅ Reset usage count for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error('Error resetting usage:', error);
    return false;
  }
}

/**
 * Get default audit limits for each plan type
 */
function getDefaultLimit(planType: string): number {
  switch (planType) {
    case 'basic': return 100;
    case 'pro': return 200;
    case 'enterprise': return 1000;
    case 'free':
    default: return 5;
  }
}

/**
 * Check if user can upgrade (has active subscription that can be modified)
 */
export async function canUpgrade(userId: string): Promise<{ canUpgrade: boolean; reason?: string }> {
  try {
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get();
    
    if (!subscriptionDoc.exists) {
      return { canUpgrade: true, reason: 'No existing subscription - can subscribe to any plan' };
    }

    const subscription = subscriptionDoc.data()!;
    
    // Can upgrade if subscription is active or if they're on free plan
    if (subscription.status === 'active' || subscription.planType === 'free') {
      return { canUpgrade: true };
    }

    // Can't upgrade if subscription is cancelled, expired, etc.
    return { 
      canUpgrade: false, 
      reason: `Current subscription is ${subscription.status}` 
    };

  } catch (error) {
    console.error('Error checking upgrade eligibility:', error);
    return { canUpgrade: true, reason: 'Error checking status - assuming can upgrade' };
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
    isNearLimit: status.auditsRemaining <= Math.ceil(status.auditsLimit * 0.1), // Within 10% of limit
    nextBillingDate: status.currentPeriodEnd,
    planDisplayName: getPlanDisplayName(status.planType),
  };
}

function getPlanDisplayName(planType: string): string {
  switch (planType) {
    case 'free': return 'Free Plan';
    case 'basic': return 'Basic Plan';
    case 'pro': return 'Pro Plan';
    case 'enterprise': return 'Enterprise Plan';
    default: return 'Unknown Plan';
  }
}
