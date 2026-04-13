"use client";

import { useState, useRef, useEffect } from "react";
import { Info, X } from "lucide-react";
import type { TooltipContent } from "@/lib/tooltips/content";

interface TooltipProps {
  content: TooltipContent;
  mode?: "icon" | "inline" | "banner";
  children?: React.ReactNode;
  userRole?: string;
  dismissedIds?: string[];
  onDismiss?: (id: string) => void;
}

export function Tooltip({
  content,
  mode = "icon",
  children,
  userRole,
  dismissedIds = [],
  onDismiss,
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(dismissedIds.includes(content.id));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDismissed(dismissedIds.includes(content.id));
  }, [dismissedIds, content.id]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Role filter — must come after all hooks
  if (content.roles && userRole && !content.roles.includes(userRole)) return null;
  if (dismissed && mode === "banner") return null;

  const handleDismiss = () => {
    setDismissed(true);
    setOpen(false);
    onDismiss?.(content.id);
  };

  // Popover content
  const popover = open && (
    <div className="absolute z-[1000] top-full left-1/2 -translate-x-1/2 mt-2 w-[280px] rounded-xl border border-primary/20 bg-[#1e1e2e] p-3.5 shadow-xl">
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t border-primary/20 bg-[#1e1e2e]" />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-bold text-[#e2e8f0]">{content.title}</p>
        <button onClick={() => setOpen(false)} className="text-[#64748b] hover:text-white shrink-0">
          <X size={14} />
        </button>
      </div>
      <p className="mt-1.5 text-[13px] text-[#94a3b8] leading-relaxed">{content.body}</p>
      {content.learnMoreHref && (
        <a href={content.learnMoreHref} className="mt-2 block text-xs text-primary hover:underline">
          Learn more →
        </a>
      )}
    </div>
  );

  // Icon mode
  if (mode === "icon") {
    return (
      <span ref={ref} className="relative inline-flex items-center">
        <button
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="text-primary/60 hover:text-primary transition-colors px-1 inline-flex items-center"
          aria-label={`Learn more about ${content.title}`}
        >
          <Info size={13} />
        </button>
        {popover}
      </span>
    );
  }

  // Inline mode
  if (mode === "inline") {
    return (
      <span ref={ref} className="relative inline">
        <span
          onClick={() => setOpen(!open)}
          className="border-b border-dotted border-primary cursor-help"
        >
          {children}
        </span>
        {popover}
      </span>
    );
  }

  // Banner mode
  if (mode === "banner") {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 border-l-[3px] border-l-primary px-4 py-3 mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="text-[13px] font-bold text-primary block mb-1">{content.title}</span>
          <span className="text-[13px] text-muted leading-relaxed">{content.body}</span>
          {content.learnMoreHref && (
            <a href={content.learnMoreHref} className="text-xs text-primary block mt-1 hover:underline">
              Learn more →
            </a>
          )}
        </div>
        <button onClick={handleDismiss} className="text-muted hover:text-lift-text shrink-0 mt-0.5">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
