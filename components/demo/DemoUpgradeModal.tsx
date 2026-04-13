"use client";

export function DemoUpgradeModal({ onDismiss, token }: { onDismiss: () => void; token: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-[500] max-w-[360px] rounded-2xl border border-primary/30 bg-[#1a1a24] p-5 shadow-2xl">
      <button onClick={onDismiss} className="absolute right-3 top-2.5 border-none bg-transparent text-lg text-white/30 hover:text-white">&times;</button>
      <p className="mb-1.5 text-sm font-bold text-primary/80">5 minutes left in your demo</p>
      <p className="mb-3.5 text-xs leading-relaxed text-white/50">Enjoying LIFT? Start your free trial to keep access and invite your real candidates.</p>
      <a href={`/register?demo_token=${token}`} className="block rounded-lg bg-gradient-to-r from-primary to-[#8b5cf6] py-2.5 text-center text-xs font-bold text-white">Start Free Trial →</a>
    </div>
  );
}
