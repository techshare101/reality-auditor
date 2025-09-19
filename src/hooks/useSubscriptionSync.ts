import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Global sync lock
let isSyncing = false;
let lastSyncTime = 0;
const MIN_SYNC_INTERVAL = 2000; // 2 seconds
const MAX_RETRIES = 3;

export function useSubscriptionSync() {
  const { user } = useAuth();
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const syncSubscription = async () => {
      // Don't sync if we've exceeded retry attempts
      if (retryCount >= MAX_RETRIES) {
        console.log('❌ Max retry attempts reached, stopping sync');
        return;
      }

      // Check if sync is already in progress or if we've synced recently
      const now = Date.now();
      if (isSyncing || (now - lastSyncTime) < MIN_SYNC_INTERVAL) {
        console.log('🔄 Sync already in progress or too recent, skipping...');
        return;
      }

      try {
        isSyncing = true;
        const idToken = await user.getIdToken();
        
        const response = await fetch('/api/subscription/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Sync failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Subscription synced:', data.status);
          lastSyncTime = now;
          setRetryCount(0); // Reset retry count on success
        } else {
          throw new Error(data.error || 'Sync failed without error details');
        }
      } catch (error) {
        console.error('❌ Error syncing subscription:', error);
        setRetryCount(prev => prev + 1);

        // Schedule retry with exponential backoff
        if (retryCount < MAX_RETRIES) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          console.log(`🔄 Retrying sync in ${backoffDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
          syncTimeoutRef.current = setTimeout(syncSubscription, backoffDelay);
        }
      } finally {
        isSyncing = false;
      }
    };

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Debounce the sync call
    syncTimeoutRef.current = setTimeout(syncSubscription, 100);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [user]);
}
