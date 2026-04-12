"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface AuditLog {
  id: string;
  tenant_id: string;
  actor_id: string | null;
  candidate_id: string | null;
  action: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  tenants: unknown;
  users: unknown;
}

function getTenantName(t: unknown): string {
  if (!t) return "—";
  if (Array.isArray(t)) return (t[0] as { name: string })?.name ?? "—";
  return (t as { name: string }).name ?? "—";
}

function getUser(u: unknown): { full_name: string; email: string } | null {
  if (!u) return null;
  if (Array.isArray(u)) return u[0] as { full_name: string; email: string } ?? null;
  return u as { full_name: string; email: string };
}

const ACTION_COLORS: Record<string, string> = {
  invite_sent: "bg-blue-100 text-blue-700",
  final_recommendation: "bg-purple-100 text-purple-700",
  report_exported: "bg-green-100 text-green-700",
  learning_support_viewed: "bg-amber-100 text-amber-700",
  support_plan_shared: "bg-indigo-100 text-indigo-700",
  registration_completed: "bg-emerald-100 text-emerald-700",
};

export function AdminAuditClient({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const tenantName = getTenantName(l.tenants).toLowerCase();
      const actor = getUser(l.users);
      const actorName = (actor?.full_name ?? "").toLowerCase();
      const actorEmail = (actor?.email ?? "").toLowerCase();
      const action = l.action.toLowerCase();
      return tenantName.includes(s) || actorName.includes(s) || actorEmail.includes(s) || action.includes(s);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lift-text">System Audit Log</h1>
        <p className="mt-1 text-sm text-muted">All actions across all tenants. Most recent 200 entries.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school, user, or action..."
            className="w-full rounded-lg border border-lift-border bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-lift-border bg-white px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-lift-border">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-muted sticky top-0">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                    {new Date(log.occurred_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium text-lift-text">{getTenantName(log.tenants)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-medium text-lift-text">{getUser(log.users)?.full_name ?? "System"}</div>
                    <div className="text-[10px] text-muted">{getUser(log.users)?.email ?? ""}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[250px]">
                    {log.payload && Object.keys(log.payload).length > 0 ? (
                      <pre className="text-[10px] text-muted truncate">{JSON.stringify(log.payload)}</pre>
                    ) : (
                      <span className="text-[10px] text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    No audit log entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted">{filtered.length} of {logs.length} entries shown</p>
    </div>
  );
}
