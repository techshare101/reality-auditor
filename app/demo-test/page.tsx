"use client";

import { Suspense } from "react";
import RealityAuditorApp from "@/components/RealityAuditor";
import RecentAuditsCard from "@/components/RecentAuditsCard";

export default function DemoTestPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
          <div className="mb-6">
            <RecentAuditsCard />
          </div>
          <RealityAuditorApp />
        </Suspense>
      </div>
    </div>
  );
}

