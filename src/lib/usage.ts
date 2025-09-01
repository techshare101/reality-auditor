import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Interface for user usage data
 */
interface UsageData {
  auditsUsed: number;
  auditsLimit: number;
  auditsRemaining: number;
  lastReset: Date;
  updatedAt: Date;
}

/**
 * Get the current month key (YYYY-MM format)
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Check if usage should be reset based on month change
 */
function shouldResetUsage(lastReset: Date | null): boolean {
  if (!lastReset) return true;
  
  const lastResetMonth = new Date(lastReset).getMonth();
  const lastResetYear = new Date(lastReset).getFullYear();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  return lastResetYear !== currentYear || lastResetMonth !== currentMonth;
}

/**
 * Get user usage data with automatic monthly reset
 * @param userId - Firebase user ID
 * @param planLimit - User's plan audit limit (default: 5 for free tier)
 * @returns Usage data including used and remaining audits
 */
export async function getUserUsage(userId: string, planLimit: number = 5): Promise<UsageData> {
  try {
    console.log(`📊 Getting usage for user ${userId} with limit ${planLimit}`);
    
    // Get or create usage document
    const usageRef = db.collection('usage').doc(userId);
    const usageDoc = await usageRef.get();
    
    let auditsUsed = 0;
    let lastReset: Date | null = null;
    
    if (usageDoc.exists) {
      const data = usageDoc.data();
      auditsUsed = data?.auditsUsed || 0;
      lastReset = data?.lastReset?.toDate() || null;
      
      // Check if we need to reset usage (new month)
      if (shouldResetUsage(lastReset)) {
        console.log(`🔄 Resetting usage for user ${userId} - new billing month`);
        auditsUsed = 0;
        
        // Update the document with reset
        await usageRef.set({
          auditsUsed: 0,
          lastReset: Timestamp.now(),
          updatedAt: Timestamp.now(),
          monthKey: getCurrentMonthKey(),
        }, { merge: true });
        
        lastReset = new Date();
      }
    } else {
      // Create new usage document
      console.log(`✨ Creating new usage doc for user ${userId}`);
      await usageRef.set({
        auditsUsed: 0,
        lastReset: Timestamp.now(),
        updatedAt: Timestamp.now(),
        monthKey: getCurrentMonthKey(),
      });
      
      lastReset = new Date();
    }
    
    const auditsRemaining = Math.max(0, planLimit - auditsUsed);
    
    console.log(`✅ User ${userId} usage: ${auditsUsed}/${planLimit} (${auditsRemaining} remaining)`);
    
    return {
      auditsUsed,
      auditsLimit: planLimit,
      auditsRemaining,
      lastReset: lastReset || new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('❌ Error getting user usage:', error);
    // Return safe defaults on error
    return {
      auditsUsed: 0,
      auditsLimit: planLimit,
      auditsRemaining: planLimit,
      lastReset: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Increment user usage count after successful audit
 * @param userId - Firebase user ID
 * @returns Updated usage count
 */
export async function incrementUserUsage(userId: string): Promise<number> {
  try {
    console.log(`📈 Incrementing usage for user ${userId}`);
    
    const usageRef = db.collection('usage').doc(userId);
    const usageDoc = await usageRef.get();
    
    let currentUsage = 0;
    let lastReset: Date | null = null;
    
    if (usageDoc.exists) {
      const data = usageDoc.data();
      currentUsage = data?.auditsUsed || 0;
      lastReset = data?.lastReset?.toDate() || null;
      
      // Check if we need to reset before incrementing
      if (shouldResetUsage(lastReset)) {
        console.log(`🔄 Resetting usage before increment for user ${userId}`);
        currentUsage = 0;
      }
    }
    
    // Increment usage
    const newUsage = currentUsage + 1;
    
    // Update document
    await usageRef.set({
      auditsUsed: newUsage,
      lastReset: shouldResetUsage(lastReset) ? Timestamp.now() : (lastReset ? Timestamp.fromDate(lastReset) : Timestamp.now()),
      updatedAt: Timestamp.now(),
      monthKey: getCurrentMonthKey(),
      lastAuditAt: Timestamp.now(),
    }, { merge: true });
    
    console.log(`✅ Usage incremented for user ${userId}: ${currentUsage} → ${newUsage}`);
    
    // Also update the main user document for quick access
    try {
      await db.collection('users').doc(userId).update({
        auditsUsed: newUsage,
        lastAuditAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (userUpdateError) {
      console.warn('⚠️ Could not update user document:', userUpdateError);
    }
    
    return newUsage;
  } catch (error) {
    console.error('❌ Error incrementing user usage:', error);
    throw error;
  }
}

/**
 * Check if user has remaining audits
 * @param userId - Firebase user ID
 * @param planLimit - User's plan audit limit
 * @returns Boolean indicating if user can perform audit
 */
export async function canUserAudit(userId: string, planLimit: number = 5): Promise<boolean> {
  const usage = await getUserUsage(userId, planLimit);
  return usage.auditsRemaining > 0;
}

/**
 * Get usage statistics for admin/analytics
 * @param userId - Firebase user ID
 * @returns Detailed usage statistics
 */
export async function getUsageStats(userId: string): Promise<{
  currentMonth: UsageData;
  allTime: { totalAudits: number };
  history: Array<{ month: string; audits: number }>;
}> {
  try {
    // Get current month usage
    const currentUsage = await getUserUsage(userId);
    
    // Get historical data (if needed in future)
    // For now, just return current month data
    return {
      currentMonth: currentUsage,
      allTime: { totalAudits: currentUsage.auditsUsed }, // Would aggregate from history
      history: [{ month: getCurrentMonthKey(), audits: currentUsage.auditsUsed }],
    };
  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    throw error;
  }
}
