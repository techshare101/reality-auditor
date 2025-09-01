/**
 * Local usage tracker for development and fallback when Firebase Admin is unavailable
 */

interface LocalUsageData {
  auditsUsed: number;
  currentPeriodStart: string;
  lastUpdated: string;
}

const STORAGE_KEY_PREFIX = 'local_usage_';

export class LocalUsageTracker {
  private static getStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  private static getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  static getUsage(userId: string): { auditsUsed: number; auditsRemaining: number } {
    try {
      const key = this.getStorageKey(userId);
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return { auditsUsed: 0, auditsRemaining: 5 };
      }

      const data: LocalUsageData = JSON.parse(stored);
      const monthStart = this.getCurrentMonthStart();
      const storedStart = new Date(data.currentPeriodStart);

      // Check if we need to reset (new month)
      if (storedStart.getTime() < monthStart.getTime()) {
        this.resetUsage(userId);
        return { auditsUsed: 0, auditsRemaining: 5 };
      }

      return { 
        auditsUsed: data.auditsUsed, 
        auditsRemaining: Math.max(0, 5 - data.auditsUsed) 
      };
    } catch (error) {
      console.error('Error reading local usage:', error);
      return { auditsUsed: 0, auditsRemaining: 5 };
    }
  }

  static incrementUsage(userId: string): { success: boolean; auditsUsed: number; auditsRemaining: number } {
    try {
      const current = this.getUsage(userId);
      
      if (current.auditsRemaining <= 0) {
        return { 
          success: false, 
          auditsUsed: current.auditsUsed, 
          auditsRemaining: 0 
        };
      }

      const newUsage = current.auditsUsed + 1;
      const data: LocalUsageData = {
        auditsUsed: newUsage,
        currentPeriodStart: this.getCurrentMonthStart().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(data));
      
      console.log(`📊 Local usage incremented for ${userId}: ${newUsage}/5`);
      
      return { 
        success: true, 
        auditsUsed: newUsage, 
        auditsRemaining: Math.max(0, 5 - newUsage) 
      };
    } catch (error) {
      console.error('Error incrementing local usage:', error);
      return { success: false, auditsUsed: 0, auditsRemaining: 5 };
    }
  }

  static resetUsage(userId: string): void {
    try {
      const data: LocalUsageData = {
        auditsUsed: 0,
        currentPeriodStart: this.getCurrentMonthStart().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(data));
      console.log(`🔄 Local usage reset for ${userId}`);
    } catch (error) {
      console.error('Error resetting local usage:', error);
    }
  }

  static syncWithFirestore(userId: string, firestoreUsage: number): void {
    try {
      const local = this.getUsage(userId);
      
      // Only update if Firestore has a higher count (to avoid overwriting)
      if (firestoreUsage > local.auditsUsed) {
        const data: LocalUsageData = {
          auditsUsed: firestoreUsage,
          currentPeriodStart: this.getCurrentMonthStart().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem(this.getStorageKey(userId), JSON.stringify(data));
        console.log(`🔄 Local usage synced with Firestore for ${userId}: ${firestoreUsage}/5`);
      }
    } catch (error) {
      console.error('Error syncing local usage:', error);
    }
  }
}
