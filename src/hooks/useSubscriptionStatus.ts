import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type SubscriptionStatus = {
  plan: string;
  status: string;
  isActive: boolean;
  currentPeriodEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAt: Date | null;
};

export function useSubscriptionStatus(userId: string | null) {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    // Listen to subscription status
    const subRef = doc(db, 'user_subscription_status', userId);
    const unsubscribe = onSnapshot(
      subRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (!mounted) return;

        try {
          if (snap.exists()) {
            const data = snap.data();
            const currentPeriodEnd = data.currentPeriodEnd?.toDate?.() || null;
            const isActive = !!currentPeriodEnd && currentPeriodEnd > new Date();

            setSubscription({
              plan: data.plan || 'free',
              status: isActive ? 'active' : 'inactive',
              isActive,
              currentPeriodEnd: currentPeriodEnd,
              stripeCustomerId: data.stripeCustomerId,
              stripeSubscriptionId: data.stripeSubscriptionId,
              updatedAt: data.updatedAt?.toDate?.() || null,
            });
          } else {
            setSubscription({
              plan: 'free',
              status: 'inactive',
              isActive: false,
              updatedAt: null,
            });
          }
          setError(null);
        } catch (err) {
          console.error('Error parsing subscription data:', err);
          setError(err instanceof Error ? err.message : 'Failed to parse subscription data');
        }
        setLoading(false);
      },
      (err) => {
        if (!mounted) return;
        console.error('Error listening to subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to listen to subscription updates');
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId]);

  // Computed properties
  const isPro = subscription?.isActive && ['pro', 'team'].includes(subscription?.plan || '');
  const isTeam = subscription?.isActive && subscription?.plan === 'team';
  const planLimit = isTeam ? 500 : isPro ? 100 : 5;
  const isSubscriptionExpired = subscription?.currentPeriodEnd 
    ? subscription.currentPeriodEnd < new Date() 
    : false;

  return {
    subscription,
    loading,
    error,
    isPro,
    isTeam,
    planLimit,
    isSubscriptionExpired,
  };
}
