"use client";

import { useAuditCache } from "@/lib/useAuditCache";

export default function RecentAuditsCard() {
  const { audits, clearAudits } = useAuditCache();

  if (!audits.length) return null;

  function restoreAudit(audit: any) {
    try {
      localStorage.setItem('realityauditor:restore', JSON.stringify(audit));
      window.dispatchEvent(new StorageEvent('storage', { key: 'realityauditor:restore', newValue: JSON.stringify(audit) }));
    } catch {}
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Recent Audits (local)</h3>
        <button
          onClick={clearAudits}
          className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
        >
          Clear
        </button>
      </div>
      <ul className="space-y-2">
        {audits.map((audit) => {
          let host = '';
          try { host = new URL(audit.url).hostname.replace(/^www\./, ''); } catch { host = audit.url; }
          const outlet = audit.result?.sources?.[0]?.outlet || 'Unknown Source';
          const created = new Date(audit.createdAt).toLocaleString();
          return (
            <li key={audit.createdAt} className="border-b border-white/5 pb-2 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{outlet}</div>
                  <div className="text-xs opacity-70 truncate">{host} • {created}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => restoreAudit(audit)}
                    className="text-xs px-2 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/30 transition"
                  >
                    Restore
                  </button>
                  <a
                    href={audit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition"
                  >
                    Open
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

