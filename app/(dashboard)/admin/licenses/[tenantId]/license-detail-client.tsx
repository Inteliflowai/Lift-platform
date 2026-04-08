"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FEATURES } from "@/lib/licensing/features";

type License = Record<string, unknown>;
type UpgradeRequest = Record<string, unknown>;
type LicenseEvent = Record<string, unknown>;

const TIERS = ["trial", "essentials", "professional", "enterprise"];
const STATUSES = ["trialing", "active", "past_due", "suspended", "cancelled"];
const ALL_FEATURES = Object.values(FEATURES);

export function LicenseDetailClient({
  tenantId,
  tenantName,
  license: initial,
  upgradeRequests,
  events,
}: {
  tenantId: string;
  tenantName: string;
  license: License;
  upgradeRequests: UpgradeRequest[];
  events: LicenseEvent[];
}) {
  const router = useRouter();
  const [license, setLicense] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  function update(field: string, value: unknown) {
    setLicense((l) => ({ ...l, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/admin/licenses/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(license),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleActivateRequest(requestId: string, requestedTier: string) {
    setActivatingId(requestId);
    await fetch(`/api/admin/licenses/${tenantId}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: requestedTier,
        billing_cycle: "annual",
        period_starts_at: new Date().toISOString(),
        period_ends_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ).toISOString(),
        request_id: requestId,
      }),
    });
    setActivatingId(null);
    router.refresh();
  }

  const featureOverrides = (license.feature_overrides as string[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tenantName}</h1>
        <p className="text-sm text-muted">License management</p>
      </div>

      {/* Core settings */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">License Settings</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Tier</label>
            <select
              value={license.tier as string}
              onChange={(e) => update("tier", e.target.value)}
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Status</label>
            <select
              value={license.status as string}
              onChange={(e) => update("status", e.target.value)}
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Trial ends at
            </label>
            <input
              type="date"
              value={
                license.trial_ends_at
                  ? new Date(license.trial_ends_at as string)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={(e) =>
                update(
                  "trial_ends_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Billing cycle
            </label>
            <select
              value={(license.billing_cycle as string) ?? ""}
              onChange={(e) =>
                update("billing_cycle", e.target.value || null)
              }
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">—</option>
              <option value="annual">Annual</option>
              <option value="biannual">Biannual</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Period starts at
            </label>
            <input
              type="date"
              value={
                license.current_period_starts_at
                  ? new Date(license.current_period_starts_at as string)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={(e) =>
                update(
                  "current_period_starts_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Period ends at
            </label>
            <input
              type="date"
              value={
                license.current_period_ends_at
                  ? new Date(license.current_period_ends_at as string)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={(e) =>
                update(
                  "current_period_ends_at",
                  e.target.value ? new Date(e.target.value).toISOString() : null
                )
              }
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Overrides */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">
              Session limit override
            </label>
            <input
              type="number"
              value={(license.session_limit_override as number) ?? ""}
              onChange={(e) =>
                update(
                  "session_limit_override",
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              placeholder="Tier default"
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Seat limit override
            </label>
            <input
              type="number"
              value={(license.seat_limit_override as number) ?? ""}
              onChange={(e) =>
                update(
                  "seat_limit_override",
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              placeholder="Tier default"
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Feature overrides */}
        <div>
          <label className="mb-1 block text-xs text-muted">
            Feature overrides (grant extra features)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_FEATURES.map((f) => (
              <label
                key={f}
                className={`cursor-pointer rounded px-2 py-0.5 text-[10px] font-medium border ${
                  featureOverrides.includes(f)
                    ? "border-success bg-success/10 text-success"
                    : "border-lift-border text-muted"
                }`}
              >
                <input
                  type="checkbox"
                  checked={featureOverrides.includes(f)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...featureOverrides, f]
                      : featureOverrides.filter((x) => x !== f);
                    update("feature_overrides", next);
                  }}
                  className="sr-only"
                />
                {f}
              </label>
            ))}
          </div>
        </div>

        {/* Internal notes */}
        <div>
          <label className="mb-1 block text-xs text-muted">
            Internal notes
          </label>
          <textarea
            value={(license.internal_notes as string) ?? ""}
            onChange={(e) => update("internal_notes", e.target.value)}
            className="w-full rounded-md border border-lift-border bg-page-bg p-3 text-sm outline-none focus:border-primary resize-none"
            rows={3}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {saved && (
            <span className="text-xs text-success">License updated</span>
          )}
        </div>
      </div>

      {/* Pending upgrade requests */}
      {upgradeRequests.filter((r) => r.status === "pending").length > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-primary">
            Pending Upgrade Requests
          </h2>
          {upgradeRequests
            .filter((r) => r.status === "pending")
            .map((r) => {
              const requester = r.users as unknown as {
                full_name: string;
                email: string;
              } | null;
              return (
                <div
                  key={r.id as string}
                  className="rounded-md border border-lift-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {r.current_tier as string} →{" "}
                        <span className="text-primary capitalize">
                          {r.requested_tier as string}
                        </span>
                      </p>
                      <p className="text-xs text-muted">
                        {requester?.full_name} ({requester?.email}) ·{" "}
                        {new Date(r.created_at as string).toLocaleDateString()}
                      </p>
                      {r.message ? (
                        <p className="mt-1 text-xs text-muted italic">
                          &quot;{String(r.message)}&quot;
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() =>
                        handleActivateRequest(
                          r.id as string,
                          r.requested_tier as string
                        )
                      }
                      disabled={activatingId === r.id}
                      className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {activatingId === r.id
                        ? "Activating..."
                        : "Activate Upgrade"}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Event log */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">License Events</h2>
        <div className="space-y-1.5">
          {events.map((e) => (
            <div
              key={e.id as string}
              className="flex items-center gap-3 text-xs"
            >
              <span className="shrink-0 text-muted">
                {new Date(e.occurred_at as string).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="rounded bg-page-bg px-1.5 py-0.5 font-mono text-[10px]">
                {e.event_type as string}
              </span>
              {e.from_tier && e.to_tier ? (
                <span className="text-muted">
                  {String(e.from_tier)} → {String(e.to_tier)}
                </span>
              ) : null}
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-xs text-muted">No events yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
