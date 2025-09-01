"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

interface DebugServerInfo {
  hasStripeKey: boolean;
  stripeApiVersion: string | null;
  appUrl: string | null;
  nodeEnv: string | null;
}

export default function BillingDebugPanel() {
  const { user } = useAuth();
  const [serverInfo, setServerInfo] = useState<DebugServerInfo | null>(null);
  const [plans, setPlans] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAuthed = !!user;

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Server debug info
      const s = await fetch("/api/debug/billing").then((r) => r.json());
      setServerInfo(s);

      // Public plans endpoint
      const p = await fetch("/api/stripe/checkout").then((r) => r.json());
      setPlans(p);

      // Subscription status (requires auth)
      if (user) {
        const token = await user.getIdToken();
        const subResp = await fetch("/api/subscription-status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubscription(await subResp.json());
      } else {
        setSubscription({ error: "Not authenticated" });
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const canOpenPortal = useMemo(() => isAuthed && !loading, [isAuthed, loading]);

  const openBillingPortal = async () => {
    if (!user) return alert("Log in first");
    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        const msg = await res.text();
        alert(`Billing portal failed: ${res.status}\n${msg}`);
      }
    } catch (e: any) {
      alert(`Billing portal error: ${e?.message || String(e)}`);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Billing Debug (dev)</h3>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {err && (
        <div className="mb-3 text-xs text-red-300">Error: {err}</div>
      )}

      <div className="grid md:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="font-semibold mb-1">Server</div>
          {serverInfo ? (
            <ul className="space-y-1 opacity-90">
              <li>Stripe key present: {String(serverInfo.hasStripeKey)}</li>
              <li>Stripe API version: {serverInfo.stripeApiVersion || "n/a"}</li>
              <li>APP URL: {serverInfo.appUrl || "n/a"}</li>
              <li>Node env: {serverInfo.nodeEnv || "n/a"}</li>
            </ul>
          ) : (
            <div className="opacity-70">loading...</div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="font-semibold mb-1">Plans</div>
          {plans ? (
            <pre className="opacity-90 whitespace-pre-wrap break-words max-h-40 overflow-auto">{JSON.stringify(plans.available || plans, null, 2)}</pre>
          ) : (
            <div className="opacity-70">loading...</div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="font-semibold mb-1">Subscription</div>
          {subscription ? (
            <pre className="opacity-90 whitespace-pre-wrap break-words max-h-40 overflow-auto">{JSON.stringify(subscription, null, 2)}</pre>
          ) : (
            <div className="opacity-70">loading...</div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={openBillingPortal}
          disabled={!canOpenPortal}
          className="text-xs px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 transition inline-flex items-center gap-1 disabled:opacity-50"
        >
          <ExternalLink className="w-3 h-3" /> Test Billing Portal
        </button>
        {!isAuthed && (
          <span className="text-[11px] opacity-70">Login required to open portal</span>
        )}
      </div>
    </div>
  );
}

