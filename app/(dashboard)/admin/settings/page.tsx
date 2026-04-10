import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLocale, getBrand } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const brand = getBrand();
  const locale = getLocale();

  // AI model versions
  const { data: aiVersions } = await supabaseAdmin
    .from("ai_versions")
    .select("dimension, model, prompt_version, created_at, is_active")
    .eq("is_active", true)
    .order("dimension");

  // Env var status (never expose values — just show presence)
  const envStatus = {
    "NEXT_PUBLIC_SUPABASE_URL": !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    "SUPABASE_SERVICE_ROLE_KEY": !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    "ANTHROPIC_API_KEY": !!process.env.ANTHROPIC_API_KEY,
    "OPENAI_API_KEY": !!process.env.OPENAI_API_KEY,
    "STRIPE_SECRET_KEY": !!process.env.STRIPE_SECRET_KEY,
    "STRIPE_WEBHOOK_SECRET": !!process.env.STRIPE_WEBHOOK_SECRET,
    "EMAIL_HOST": !!process.env.EMAIL_HOST,
    "EMAIL_USER": !!process.env.EMAIL_USER,
    "HL_API_KEY": !!process.env.HL_API_KEY,
    "INTERNAL_API_SECRET": !!process.env.INTERNAL_API_SECRET,
    "CRON_SECRET": !!process.env.CRON_SECRET,
  };

  const allConfigured = Object.values(envStatus).every(Boolean);
  const missingCount = Object.values(envStatus).filter((v) => !v).length;

  // Feature flags status
  const featureFlags = {
    "Locale": locale,
    "Brand": brand.name,
    "Hide Pricing": brand.hidePricing ? "Yes" : "No",
    "Dev Mode": process.env.LIFT_DEV_MODE === "true" ? "On" : "Off",
    "Node Env": process.env.NODE_ENV ?? "unknown",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Platform Settings</h1>

      {/* System Status */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">System Status</h2>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${allConfigured ? "bg-success" : "bg-warning"}`} />
          <p className="text-sm">
            {allConfigured
              ? "All services configured and operational"
              : `${missingCount} service${missingCount > 1 ? "s" : ""} not configured`}
          </p>
        </div>
      </div>

      {/* Environment Configuration */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Environment Configuration</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(envStatus).map(([key, configured]) => (
            <div key={key} className="flex items-center gap-2 rounded-md border border-lift-border px-3 py-2">
              <div className={`h-2 w-2 rounded-full ${configured ? "bg-success" : "bg-review"}`} />
              <span className="text-xs font-mono text-muted">{key}</span>
              <span className={`ml-auto text-[10px] font-medium ${configured ? "text-success" : "text-review"}`}>
                {configured ? "Set" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Feature Flags</h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(featureFlags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-md border border-lift-border px-3 py-2">
              <span className="text-xs text-muted">{key}</span>
              <span className="text-xs font-medium text-lift-text">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Model Versions */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Active AI Models</h2>
        {(!aiVersions || aiVersions.length === 0) ? (
          <p className="text-xs text-muted">No AI model versions configured. Run the pipeline seed script to initialize.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="pb-2 font-medium">Dimension</th>
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium">Version</th>
                  <th className="pb-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {aiVersions.map((v) => (
                  <tr key={v.dimension}>
                    <td className="py-2 font-medium capitalize">{v.dimension}</td>
                    <td className="py-2 font-mono text-[10px] text-muted">{v.model}</td>
                    <td className="py-2">{v.prompt_version}</td>
                    <td className="py-2 text-muted">
                      {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deployment Info */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Deployment</h2>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between rounded-md border border-lift-border px-3 py-2">
            <span className="text-muted">App URL</span>
            <span className="font-mono text-lift-text">{process.env.NEXT_PUBLIC_APP_URL ?? "Not set"}</span>
          </div>
          <div className="flex justify-between rounded-md border border-lift-border px-3 py-2">
            <span className="text-muted">Supabase</span>
            <span className="font-mono text-lift-text truncate max-w-[200px]">
              {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").split(".")[0] ?? "Not set"}
            </span>
          </div>
          <div className="flex justify-between rounded-md border border-lift-border px-3 py-2">
            <span className="text-muted">Stripe Mode</span>
            <span className="font-mono text-lift-text">
              {process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "Live" : process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ? "Test" : "Not set"}
            </span>
          </div>
          <div className="flex justify-between rounded-md border border-lift-border px-3 py-2">
            <span className="text-muted">HighLevel</span>
            <span className="font-mono text-lift-text">
              {process.env.HL_API_KEY ? "Connected" : "Not configured"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Quick Links</h2>
        <div className="grid grid-cols-2 gap-2">
          <a href="/api/health" target="_blank" className="rounded-md border border-lift-border px-3 py-2 text-xs text-primary hover:bg-primary/5">
            Health Check Endpoint →
          </a>
          <a href="/admin/licenses/health" className="rounded-md border border-lift-border px-3 py-2 text-xs text-primary hover:bg-primary/5">
            License Health Dashboard →
          </a>
          <a href="/admin/licenses/revenue" className="rounded-md border border-lift-border px-3 py-2 text-xs text-primary hover:bg-primary/5">
            Revenue Report →
          </a>
          <a href="/admin/reports" className="rounded-md border border-lift-border px-3 py-2 text-xs text-primary hover:bg-primary/5">
            System Reports →
          </a>
        </div>
      </div>
    </div>
  );
}
