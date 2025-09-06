"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to grant immediate Pro access after successful Stripe payment
 * This provides a better UX by not making users wait for webhook processing
 */
export function useImmediateProAccess() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [hasJustUpgraded, setHasJustUpgraded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check if user just came back from Stripe checkout success
    const upgrade = searchParams?.get('upgrade');
    const session = searchParams?.get('session_id');
    
    if (upgrade === 'success' && session && user) {
      console.log('🎉 User just upgraded! Session:', session);
      setHasJustUpgraded(true);
      setSessionId(session);
      
      // Store in sessionStorage to persist during session
      const upgradeData = {
        userId: user.uid,
        sessionId: session,
        timestamp: Date.now(),
        email: user.email
      };
      
      sessionStorage.setItem('reality_auditor_pro_upgrade', JSON.stringify(upgradeData));
    }
  }, [searchParams, user]);

  // Check sessionStorage for recent upgrade
  useEffect(() => {
    if (!hasJustUpgraded && user) {
      const stored = sessionStorage.getItem('reality_auditor_pro_upgrade');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          // Check if it's the same user and upgrade happened in last 24 hours
          const isRecent = Date.now() - data.timestamp < 24 * 60 * 60 * 1000;
          if (data.userId === user.uid && isRecent) {
            setHasJustUpgraded(true);
            setSessionId(data.sessionId);
            console.log('✅ Found recent Pro upgrade in session storage');
          }
        } catch (error) {
          console.error('Error parsing upgrade data:', error);
        }
      }
    }
  }, [user, hasJustUpgraded]);

  // Clear upgrade flag after webhook has had time to process (5 minutes)
  useEffect(() => {
    if (hasJustUpgraded) {
      const timer = setTimeout(() => {
        console.log('🔄 Clearing temporary Pro access flag (webhook should have processed by now)');
        sessionStorage.removeItem('reality_auditor_pro_upgrade');
        setHasJustUpgraded(false);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(timer);
    }
  }, [hasJustUpgraded]);

  return {
    hasJustUpgraded,
    sessionId,
    // Helper to manually clear the upgrade status
    clearUpgradeStatus: () => {
      sessionStorage.removeItem('reality_auditor_pro_upgrade');
      setHasJustUpgraded(false);
      setSessionId(null);
    }
  };
}
