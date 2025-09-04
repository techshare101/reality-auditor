import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useSubscriptionSync() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const syncSubscription = async () => {
      try {
        const idToken = await user.getIdToken();
        
        const response = await fetch('/api/subscription/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          }
        });

        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Subscription synced:', data.status);
        } else {
          console.error('❌ Subscription sync failed:', data.error);
        }
      } catch (error) {
        console.error('❌ Error syncing subscription:', error);
      }
    };

    // Sync on mount and when user changes
    syncSubscription();
  }, [user]);
}
