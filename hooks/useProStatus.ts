import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // adjust import

export function useProStatus(userId?: string) {
  const [status, setStatus] = useState<"free" | "pro" | "loading">("loading");

  useEffect(() => {
    if (!userId) {
      setStatus("free");
      return;
    }

    const unsub = onSnapshot(
      doc(db, "profiles", userId), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Map 'active' subscription_status to 'pro'
          const subStatus = data.subscription_status;
          console.log("[useProStatus] Profile data:", {
            userId,
            subscription_status: subStatus,
            fullData: data
          });
          if (subStatus === "active" || subStatus === "pro") {
            console.log("[useProStatus] Setting status to PRO");
            setStatus("pro");
          } else {
            console.log("[useProStatus] Setting status to FREE");
            setStatus("free");
          }
        } else {
          console.log("[useProStatus] No profile document found for user:", userId);
          setStatus("free");
        }
      },
      (error) => {
        console.error("Error fetching subscription status:", error);
        setStatus("free");
      }
    );

    return () => unsub();
  }, [userId]);

  return status;
}