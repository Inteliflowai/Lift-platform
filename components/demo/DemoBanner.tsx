"use client";

export function DemoBanner({ token }: { token: string }) {
  return (
    <div className="flex items-center justify-between border-b border-primary/20 bg-gradient-to-r from-[#2b1460] to-[#4a2286] px-6 py-2.5">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-primary/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/80">Live Demo</span>
        <span className="text-xs text-white/60">You&apos;re exploring LIFT with demo candidates. This is the real platform.</span>
      </div>
      <a href={`/register?demo_token=${token}`} className="rounded-lg bg-gradient-to-r from-[#ec4899] to-[#f59e0b] px-5 py-2 text-xs font-bold text-white">Start Free Trial →</a>
    </div>
  );
}
