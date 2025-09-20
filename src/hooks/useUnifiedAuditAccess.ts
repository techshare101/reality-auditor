import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
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

  // Normalize plan & usage
  const plan = userData?.plan || "free";
  const isProUser = plan === "pro";
  const audits_used = userData?.audits_used ?? 0;

  return {
    user,
    userData,
    plan,
    isProUser,
    audits_used,
    loading,
  };
}
