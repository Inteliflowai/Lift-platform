"use client";

import { useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";

type Cycle = {
  id: string;
  name: string;
  academic_year: string;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
};

type GradeBand = {
  id: string;
  grade_band: string;
  name: string;
  config: {
    task_count?: number;
    time_limit_minutes?: number;
    hint_density?: string;
    ux_mode?: string;
  };
};

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  status: string;
  created_at: string;
};

export function CycleDetailClient({
  cycle: initialCycle,
  gradeBands: initialBands,
  candidates,
}: {
  cycle: Cycle;
  gradeBands: GradeBand[];
  candidates: Candidate[];
}) {
  const [tab, setTab] = useState<"overview" | "bands" | "candidates">("overview");
  const [cycle, setCycle] = useState(initialCycle);
  const [bands, setBands] = useState(initialBands);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const statusFlow: Record<string, string> = {
    draft: "active",
    active: "closed",
  };
  const nextStatus = statusFlow[cycle.status];

  async function toggleStatus() {
    if (!nextStatus) return;
    setSaving(true);
    const res = await fetch(`/api/school/cycles/${cycle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCycle(updated);
    }
    setSaving(false);
  }

  async function saveBandConfig(bandId: string, config: GradeBand["config"]) {
    const res = await fetch(
      `/api/school/cycles/${cycle.id}/grade-bands/${bandId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setBands((prev) => prev.map((b) => (b.id === bandId ? updated : b)));
    }
  }

  const filteredCandidates = candidates.filter(
    (c) =>
      !search ||
      `${c.first_name} ${c.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const tabs = ["overview", "bands", "candidates"] as const;

  return (
    <div className="space-y-6">
      <BackButton href="/school/cycles" label="Cycles" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{cycle.name}</h1>
          <p className="text-sm text-muted">{cycle.academic_year}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            cycle.status === "active"
              ? "bg-success/10 text-success"
              : cycle.status === "draft"
              ? "bg-muted/10 text-muted"
              : "bg-warning/10 text-warning"
          }`}
        >
          {cycle.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-lift-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-lift-text"
            }`}
          >
            {t === "bands" ? "Grades" : t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-indigo">
              <p className="text-xs text-muted">🎓 Candidates</p>
              <p className="mt-1 stat-hero text-lift-text">{candidates.length}</p>
            </div>
            <div className="card-hover rounded-lg border border-lift-border bg-surface p-4 accent-left-indigo">
              <p className="text-xs text-muted">📅 Academic Year</p>
              <p className="mt-1 text-lg font-bold text-lift-text">{cycle.academic_year || "—"}</p>
            </div>
          </div>

          {nextStatus && candidates.length === 0 && cycle.status === "draft" ? (
            <p className="text-xs text-muted">
              Add candidates before activating this cycle.
            </p>
          ) : nextStatus ? (
            <button
              onClick={toggleStatus}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving
                ? "Updating..."
                : `Move to ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`}
            </button>
          ) : null}
        </div>
      )}

      {/* Grade Bands Tab */}
      {tab === "bands" && (
        <div className="space-y-4">
          {bands.map((band) => (
            <GradeBandEditor
              key={band.id}
              band={band}
              onSave={(config) => saveBandConfig(band.id, config)}
            />
          ))}
        </div>
      )}

      {/* Candidates Tab */}
      {tab === "candidates" && (
        <div className="space-y-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates..."
            className="w-full max-w-sm rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
          <div className="overflow-x-auto rounded-lg border border-lift-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-lift-border bg-surface text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {filteredCandidates.map((c) => (
                  <tr key={c.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/school/candidates/${c.id}`}
                        className="text-primary hover:underline"
                      >
                        {c.first_name} {c.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{c.grade_band}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {filteredCandidates.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted"
                    >
                      No candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function GradeBandEditor({
  band,
  onSave,
}: {
  band: GradeBand;
  onSave: (config: GradeBand["config"]) => void;
}) {
  const [config, setConfig] = useState(band.config);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(config);
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-lift-border bg-surface p-5">
      <h3 className="mb-3 text-sm font-semibold">
        Grade {band.grade_band} — {band.name}
      </h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-muted">Session Tasks</label>
          <input
            type="number"
            value={config.task_count ?? ""}
            onChange={(e) =>
              setConfig({ ...config, task_count: parseInt(e.target.value) || 0 })
            }
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">
            Time Limit (min)
          </label>
          <input
            type="number"
            value={config.time_limit_minutes ?? ""}
            onChange={(e) =>
              setConfig({
                ...config,
                time_limit_minutes: parseInt(e.target.value) || 0,
              })
            }
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Hint Usage Level</label>
          <select
            value={config.hint_density ?? "medium"}
            onChange={(e) =>
              setConfig({ ...config, hint_density: e.target.value })
            }
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            <option value="low">Low</option>
            <option value="medium">Moderate</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Session Experience</label>
          <select
            value={config.ux_mode ?? "standard"}
            onChange={(e) => setConfig({ ...config, ux_mode: e.target.value })}
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            <option value="simple">Focused</option>
            <option value="standard">Standard</option>
            <option value="advanced">Extended</option>
          </select>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    invited: "bg-primary/10 text-primary",
    consent_pending: "bg-warning/10 text-warning",
    active: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    flagged: "bg-review/10 text-review",
    reviewed: "bg-muted/10 text-muted",
    archived: "bg-muted/10 text-muted",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-muted/10 text-muted"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
