export default function DemoExpiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f13]">
      <div className="max-w-[440px] text-center">
        <div className="mb-4 text-5xl">&#9200;</div>
        <h1 className="mb-3 font-[family-name:var(--font-display)] text-3xl font-bold text-white">This demo link has expired</h1>
        <p className="mb-7 text-base leading-relaxed text-white/50">Demo sessions last 30 minutes. Start a new demo or sign up for a free 30-day trial.</p>
        <div className="flex justify-center gap-3">
          <a href="/demo/new" className="rounded-lg border border-primary/40 bg-primary/10 px-6 py-3 text-sm font-semibold text-primary">Try Demo Again</a>
          <a href="/register" className="rounded-lg bg-gradient-to-r from-[#ec4899] to-[#f59e0b] px-6 py-3 text-sm font-bold text-white">Start Free Trial →</a>
        </div>
      </div>
    </div>
  );
}
