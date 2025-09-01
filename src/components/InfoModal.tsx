"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";

export default function InfoModal({
  triggerLabel,
  title,
  children,
  className = "text-xs text-gray-400 hover:text-white underline",
}: {
  triggerLabel: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={className}
        type="button"
      >
        {triggerLabel}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg rounded-2xl bg-white/10 backdrop-blur p-6 shadow-lg text-sm text-white border border-white/10">
            <Dialog.Title className="text-lg font-semibold mb-3">{title}</Dialog.Title>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {children}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-sm"
              >
                Close
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}

