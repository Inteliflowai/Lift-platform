"use client";

export function DemoExpiredModal({ token }: { token: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div className="max-w-[480px] rounded-2xl border border-primary/20 bg-[#1a1a24] p-12 text-center">
        <div className="mb-4 text-5xl">&#9200;</div>
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl font-bold text-white">Your demo has ended</h2>
        <p className="mb-7 text-base leading-relaxed text-white/50">You&apos;ve seen the full LIFT evaluator experience. Start your free 30-day trial to use LIFT with your real candidates. No credit card required.</p>
        <a href={`/register?demo_token=${token}`} className="mb-3 block w-full rounded-xl bg-gradient-to-r from-[#ec4899] to-[#f59e0b] py-4 text-base font-bold text-white">Start Free Trial — No Credit Card →</a>
        <a href="https://admissions.inteliflowai.com" className="text-sm text-white/40">Back to marketing page</a>
      </div>
    </div>
  );
}
