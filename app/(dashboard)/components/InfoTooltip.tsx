"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Info } from "lucide-react";

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [showBelow, setShowBelow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const checkPosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setShowBelow(rect.top < 120);
  }, []);

  useEffect(() => {
    if (open) checkPosition();
  }, [open, checkPosition]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-muted/50 hover:text-muted transition-colors"
        aria-label="More info"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className={`absolute left-1/2 z-50 w-64 -translate-x-1/2 rounded-lg border border-lift-border bg-white p-3 text-xs leading-relaxed text-muted shadow-lg ${showBelow ? "top-full mt-2" : "bottom-full mb-2"}`}>
          {text}
          <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${showBelow ? "bottom-full border-b-white" : "top-full border-t-white"}`} />
        </div>
      )}
    </div>
  );
}
