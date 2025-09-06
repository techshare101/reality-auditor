"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to grant immediate Pro access after successful Stripe payment
 * This provides a better UX by not making users wait for webhook processing
 */
export function useImmediateProAccess() {
  const [isMounted, setIsMounted] = useState(false);
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [hasJustUpgraded, setHasJustUpgraded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Ensure we only run on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
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
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reality_auditor_pro_upgrade', JSON.stringify(upgradeData));
      }
    }
  }, [searchParams, user, isMounted]);

  // Check sessionStorage for recent upgrade
  useEffect(() => {
    if (!isMounted || hasJustUpgraded || !user) return;
    
    if (typeof window !== 'undefined') {
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
  }, [user, hasJustUpgraded, isMounted]);

  // Clear upgrade flag after webhook has had time to process (5 minutes)
  useEffect(() => {
    if (hasJustUpgraded && isMounted) {
      const timer = setTimeout(() => {
        console.log('🔄 Clearing temporary Pro access flag (webhook should have processed by now)');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('reality_auditor_pro_upgrade');
        }
        setHasJustUpgraded(false);
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearTimeout(timer);
    }
  }, [hasJustUpgraded, isMounted]);

  return {
    hasJustUpgraded,
    sessionId,
    // Helper to manually clear the upgrade status
    clearUpgradeStatus: () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reality_auditor_pro_upgrade');
      }
      setHasJustUpgraded(false);
      setSessionId(null);
    }
  };
}
