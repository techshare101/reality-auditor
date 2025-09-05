"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

type SubscriptionStatus = {
  plan: string;
  status: string;
  stripeCustomerId?: string;
  updatedAt: Date | null;
};

export function useUserSubscription() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Listen to subscription changes
  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "user_subscription_status", user.uid);
    const unsub = onSnapshot(
      ref, 
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSubscription({
            plan: data.plan || 'free',
            status: data.status || 'inactive',
            stripeCustomerId: data.stripeCustomerId,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
          });
        } else {
          // No subscription doc = free user
          setSubscription({
            plan: 'free',
            status: 'inactive',
            updatedAt: null,
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching subscription:', error);
        // Default to free on error
        setSubscription({
          plan: 'free',
          status: 'inactive',
          updatedAt: null,
        });
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const isPro = subscription?.status === 'active' && subscription?.plan === 'pro';
  const canAudit = isPro; // Pro users have unlimited audits

  return { 
    user, 
    subscription, 
    loading,
    isPro,
    canAudit
  };
}
