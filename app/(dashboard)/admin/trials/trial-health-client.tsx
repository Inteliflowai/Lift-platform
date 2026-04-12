"use client";

import { useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Users, Send } from "lucide-react";

interface TrialHealth {
  tenant_id: string;
  tenant_name: string;
  slug: string;
  trial_ends_at: string;
  tier: string;
  license_status: string;
  days_remaining: number;
  days_since_signup: number;
  day1_login: boolean;
  candidate_invited: boolean;
  candidate_completed: boolean;
  first_session_day: number | null;
  feature_depth_score: number;
  last_event_at: string | null;
  total_candidates_run: number;
  completed_events: string[] | null;
  health_status: string;
}

const EVENT_LABELS: Record<string, string> = {
  first_candidate_invited: "Invited candidate",
  first_candidate_completed: "Completed session",
  evaluator_workspace_opened: "Opened evaluator",
  tri_report_viewed: "Viewed TRI report",
  pdf_downloaded: "Downloaded PDF",
  support_plan_viewed: "Viewed support plan",
  evaluator_intelligence_opened: "Used evaluator intelligence",
};

const ALL_FEATURE_EVENTS = Object.keys(EVENT_LABELS);

function daysColor(days: number): string {
  if (days < 7) return "text-[#f43f5e]";
  if (days < 14) return "text-[#f59e0b]";
  return "text-[#10b981]";
}

function depthColor(score: number): string {
  if (score >= 5) return "bg-[#10b981]";
  if (score >= 3) return "bg-[#f59e0b]";
  return "bg-[#f43f5e]";
}

export function TrialHealthClient({ trials }: { trials: TrialHealth[] }) {
  const [nudging, setNudging] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredDepth, setHoveredDepth] = useState<string | null>(null);

  const healthy = trials.filter((t) => t.health_status === "healthy").length;
  const atRisk = trials.filter((t) => t.health_status === "at_risk").length;
  const avgDepth = trials.length > 0
    ? (trials.reduce((sum, t) => sum + t.feature_depth_score, 0) / trials.length).toFixed(1)
    : "0";

  async function sendNudge(tenantId: string, name: string) {
    setNudging(tenantId);
    try {
      const res = await fetch("/api/admin/trials/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        setToast(`Nudge sent to ${name}`);
        setTimeout(() => setToast(null), 4000);
      }
    } catch { /* ignore */ }
    setNudging(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lift-text">Trial Health</h1>
        <p className="mt-1 text-sm text-muted">Active trial schools and engagement signals</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-lg border border-[#10b981]/20 bg-[#10b981]/10 px-4 py-3 text-sm font-medium text-[#10b981]">
          {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <div className="flex items-center gap-2 text-muted"><Users size={16} /><span className="text-xs font-medium">Total Trials</span></div>
          <p className="mt-1 text-2xl font-bold text-lift-text">{trials.length}</p>
        </div>
        <div className="rounded-lg border border-[#10b981]/20 bg-[#10b981]/5 p-4">
          <div className="flex items-center gap-2 text-[#10b981]"><CheckCircle size={16} /><span className="text-xs font-medium">Healthy</span></div>
          <p className="mt-1 text-2xl font-bold text-[#10b981]">{healthy}</p>
        </div>
        <div className="rounded-lg border border-[#f43f5e]/20 bg-[#f43f5e]/5 p-4">
          <div className="flex items-center gap-2 text-[#f43f5e]"><AlertTriangle size={16} /><span className="text-xs font-medium">At Risk</span></div>
          <p className="mt-1 text-2xl font-bold text-[#f43f5e]">{atRisk}</p>
        </div>
        <div className="rounded-lg border border-lift-border bg-surface p-4">
          <div className="flex items-center gap-2 text-muted"><Activity size={16} /><span className="text-xs font-medium">Avg Feature Depth</span></div>
          <p className="mt-1 text-2xl font-bold text-lift-text">{avgDepth} <span className="text-sm font-normal text-muted">/ 7</span></p>
        </div>
      </div>

      {/* Table */}
      {trials.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-lift-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-muted">
              <tr>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Days Left</th>
                <th className="px-4 py-3">Day 1 Login</th>
                <th className="px-4 py-3">First Session</th>
                <th className="px-4 py-3">Feature Depth</th>
                <th className="px-4 py-3">Candidates</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {trials.map((t) => (
                <tr key={t.tenant_id} className={t.health_status === "at_risk" ? "bg-[#f43f5e]/3" : ""}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-lift-text">{t.tenant_name}</div>
                    <div className="text-xs text-muted">{t.slug}</div>
                  </td>
                  <td className={`px-4 py-3 font-bold ${daysColor(t.days_remaining)}`}>
                    {t.days_remaining}
                  </td>
                  <td className="px-4 py-3">
                    {t.day1_login
                      ? <span className="text-[#10b981] font-bold">&#10003;</span>
                      : <span className="text-[#f43f5e] font-bold">&#10007;</span>}
                  </td>
                  <td className="px-4 py-3">
                    {t.candidate_completed
                      ? <span className="text-[#10b981] font-bold">&#10003; <span className="text-xs font-normal text-muted">day {t.first_session_day}</span></span>
                      : <span className="text-[#f43f5e] font-bold">&#10007;</span>}
                  </td>
                  <td className="px-4 py-3 relative"
                    onMouseEnter={() => setHoveredDepth(t.tenant_id)}
                    onMouseLeave={() => setHoveredDepth(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
                        <div className={`h-full rounded-full ${depthColor(t.feature_depth_score)}`} style={{ width: `${(t.feature_depth_score / 7) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted">{t.feature_depth_score}/7</span>
                    </div>
                    {/* Tooltip */}
                    {hoveredDepth === t.tenant_id && (
                      <div className="absolute z-10 left-0 top-full mt-1 w-56 rounded-lg border border-lift-border bg-white p-3 shadow-lg text-xs">
                        {ALL_FEATURE_EVENTS.map((evt) => {
                          const done = t.completed_events?.includes(evt);
                          return (
                            <div key={evt} className="flex items-center gap-2 py-0.5">
                              <span className={done ? "text-[#10b981]" : "text-gray-300"}>{done ? "&#10003;" : "&#10007;"}</span>
                              <span className={done ? "text-lift-text" : "text-muted"}>{EVENT_LABELS[evt]}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-lift-text">{t.total_candidates_run}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      t.health_status === "healthy"
                        ? "bg-[#10b981]/10 text-[#10b981]"
                        : "bg-[#f43f5e]/10 text-[#f43f5e]"
                    }`}>
                      {t.health_status === "healthy" ? "Healthy" : "At Risk"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => sendNudge(t.tenant_id, t.tenant_name)}
                      disabled={nudging === t.tenant_id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      <Send size={12} />
                      {nudging === t.tenant_id ? "..." : "Nudge"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-lift-border p-12 text-center">
          <Activity size={32} className="mx-auto text-muted/30" />
          <p className="mt-3 text-sm font-medium text-lift-text">No active trials</p>
          <p className="mt-1 text-xs text-muted">Trial schools will appear here once they register. Track their engagement and intervene when signals show risk.</p>
        </div>
      )}
    </div>
  );
}
