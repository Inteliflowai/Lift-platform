"use client";

import { useState, useEffect, useCallback } from "react";

export function DemoTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  const stableOnExpire = useCallback(onExpire, [onExpire]);

  useEffect(() => {
    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) { stableOnExpire(); return; }
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
      setUrgent(ms < 5 * 60 * 1000);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, stableOnExpire]);

  return (
    <div className={`fixed right-5 top-[52px] z-[500] flex items-center gap-2 rounded-lg border px-3.5 py-2 ${urgent ? "border-red-500/40 bg-red-500/10" : "border-primary/30 bg-primary/10"}`}>
      <span className="text-sm">{urgent ? "⚠️" : "⏱"}</span>
      <div>
        <div className={`font-mono text-lg font-bold leading-none ${urgent ? "text-red-400" : "text-primary/80"}`}>{remaining}</div>
        <div className="text-[10px] text-white/60">Demo remaining</div>
      </div>
    </div>
  );
}
