"use client";

import { useState } from "react";
import RealityAuditorApp from "@/components/RealityAuditor";
import demoResult from "@/lib/demoPayload";

export default function DemoPage() {
  const [data, setData] = useState(demoResult as any);
  const [key, setKey] = useState(0);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white">
      <div className="bg-yellow-500/10 text-yellow-200 text-sm text-center py-2 border-b border-yellow-500/20">
        🚀 Demo Mode — results below are simulated for preview only.
      </div>
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex justify-end p-2">
          <button
            onClick={() => {
              setKey((k) => k + 1);
              setData(demoResult as any);
            }}
            className="text-xs px-3 py-1 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 transition"
          >
            🔄 Reset Demo
          </button>
        </div>
        <RealityAuditorApp key={key} initialData={data} demoMode />
      </div>
    </div>
  );
}

