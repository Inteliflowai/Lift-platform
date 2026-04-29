"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "lift-mobile-warn-dismissed";

/**
 * One-line dismissible banner for viewports under 768px. Trial users coming
 * from LinkedIn often tap through on phones; LIFT's evaluator surfaces are
 * desktop/tablet-first and the candidate session UX is a different shape on
 * phones than on tablets. Soft-warn (not hard-block) so we don't lose the
 * lead — a phone-first user can still proceed.
 */
export function MobileSoftWarn() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    if (window.innerWidth < 768) setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }

  if (!show) return null;

  return (
    <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-[#1e1b2e] text-white text-xs px-4 py-2 flex items-center justify-between gap-3 border-b border-white/10">
      <span>LIFT works best on desktop or tablet.</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}
