"use client";

import React from "react";

export function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-[#f0f0f0] via-[#e0e0e0] to-[#f0f0f0] bg-[length:200%_100%] ${className}`}
      style={{ animation: "shimmer 1.5s ease infinite", ...style }}
    />
  );
}

export function CandidateListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-lift-border bg-surface p-4">
          <Shimmer className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-3 w-24" />
          </div>
          <Shimmer className="h-6 w-16 rounded-full" />
          <Shimmer className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function CandidateDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Shimmer className="h-36 w-48 rounded-xl" />
      </div>
      <Shimmer className="mx-auto h-64 w-64 rounded-full" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Shimmer className="h-4 w-28" />
            <Shimmer className="h-3 flex-1 rounded-full" />
            <Shimmer className="h-4 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BriefingSkeleton() {
  return (
    <div className="rounded-lg border-l-4 border-[#6366f1] bg-[#6366f1]/5 p-5 space-y-4">
      <Shimmer className="h-5 w-48" />
      <div className="space-y-2">
        {[60, 80, 70].map((w, i) => (
          <Shimmer key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="space-y-2">
        {[90, 75, 85, 65].map((w, i) => (
          <Shimmer key={i} className="h-8 rounded-md" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
