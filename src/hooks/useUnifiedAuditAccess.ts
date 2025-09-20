import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";

export function useUnifiedAuditAccess() {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Check optimistic Pro status first (e.g., after payment)
  const hasJustPaid = !loading && localStorage.getItem("justPaid") === "true";

  // Debug log the user data
  useEffect(() => {
    if (!loading && userData) {
      console.log('🔄 User Data:', {
        uid: user?.uid,
        plan: userData.plan,
        isProUser: userData.isProUser,
        subscriptionStatus: userData.subscriptionStatus,
        current_period_end: userData.current_period_end,
        rawData: userData
      });
    }
  }, [loading, userData, user?.uid]);

  // Pro email check (sync with useHybridAuditLimit)
  const GUARANTEED_PRO_EMAILS = [
    'valentin2v2000@gmail.com',
    // Add your email here
  ];

  // Normalize plan & usage
  const plan = hasJustPaid ? "pro" : userData?.plan || "free";
  
  // Enhanced Pro status detection
  const isProUser = (
    hasJustPaid || 
    plan === "pro" || 
    userData?.isProUser === true || 
    userData?.subscriptionStatus === "active" ||
    (userData?.current_period_end?.toDate?.() > new Date()) ||
    (user?.email && GUARANTEED_PRO_EMAILS.includes(user.email.toLowerCase()))
  );

  // Ensure userData reflects Pro status for guaranteed emails
  useEffect(() => {
    if (user?.email && GUARANTEED_PRO_EMAILS.includes(user.email.toLowerCase())) {
      console.log('✨ Guaranteed Pro email detected, enforcing Pro status');
      if (userData && !userData.isProUser) {
        const docRef = doc(db, 'users', user.uid);
        setUserData({
          ...userData,
          isProUser: true,
          plan: 'pro',
          subscriptionStatus: 'active'
        });

        // Update Firestore in background
        updateDoc(docRef, {
          isProUser: true,
          plan: 'pro',
          subscriptionStatus: 'active'
        }).catch(console.error);
      }
    }
  }, [user?.email, userData]);
  
  // Debug log Pro status determination
  useEffect(() => {
    console.log('✨ Pro Status Check:', {
      hasJustPaid,
      planIsPro: plan === "pro",
      isProUserFlag: userData?.isProUser,
      subscriptionActive: userData?.subscriptionStatus === "active",
      hasValidPeriod: userData?.current_period_end?.toDate?.() > new Date(),
      finalIsProUser: isProUser
    });
  }, [hasJustPaid, plan, userData, isProUser]);

  const audits_used = userData?.audits_used ?? 0;

  // Clear optimistic flag if we have real data
  useEffect(() => {
    if (!loading && hasJustPaid && userData?.plan) {
      localStorage.removeItem("justPaid");
    }
  }, [loading, hasJustPaid, userData?.plan]);

  return {
    user,
    userData,
    plan,
    isProUser,
    audits_used,
    loading,
  };
}
