// Key changes to make in RealityAuditorApp component:

// 1. Replace the imports at the top
import { useProStatus } from "@/hooks/useProStatus";

// 2. Replace lines 172-179 with:
export default function RealityAuditorApp({ initialData, demoMode }: { initialData?: any; demoMode?: boolean }) {
  const { user } = useAuth();
  const { audits_used, loading: subscriptionLoading } = useUnifiedAuditAccess();
  
  // Use the unified Pro status from Firestore
  const proStatus = useProStatus(user?.uid);
  const isProUser = proStatus === "pro";
  
  // Simplified logic - Pro users have no limits
  const used = audits_used;
  const canAudit = isProUser || used < 5;
  const showPaywall = !isProUser && used >= 5;
  
  const { increment: incrementUsage } = useHybridAuditLimit(5);
  
  // ... rest of the component

// 3. Replace the onAudit function (lines 302-340) with:
async function onAudit() {
  // Skip limit checks for demo mode and Pro users
  if (!demoMode) {
    // Pro users bypass all limits
    if (isProUser) {
      console.log("✅ Pro user - unlimited audits");
    } else if (used >= 5) {
      // Free users hit limit
      console.log(`🚫 Audit limit reached - upgrade to Pro for unlimited audits`);
      setShowUpgradePrompt(true);
      return;
    }
  }
  
  setError(null);
  setData(null);
  setProgress(0);
  
  // ... rest of the audit logic
}