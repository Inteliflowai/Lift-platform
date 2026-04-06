"use client";

import { useState } from "react";

type Log = {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  occurred_at: string;
  users: { full_name: string | null; email: string } | null;
  candidates: { first_name: string; last_name: string } | null;
};

export function AuditLogClient({ logs }: { logs: Log[] }) {
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((l) => {
    if (actionFilter && l.action !== actionFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const actor = (l.users as { full_name: string | null; email: string } | null);
      const cand = (l.candidates as { first_name: string; last_name: string } | null);
      const actorName = actor?.full_name ?? actor?.email ?? "";
      const candName = cand ? `${cand.first_name} ${cand.last_name}` : "";
      if (!actorName.toLowerCase().includes(s) && !candName.toLowerCase().includes(s) && !l.action.includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>

      <div className="flex flex-wrap gap-3">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary" />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none">
          <option value="">All Actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {filtered.map((l) => {
              const actor = l.users as { full_name: string | null; email: string } | null;
              const cand = l.candidates as { first_name: string; last_name: string } | null;
              return (
                <tr key={l.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{new Date(l.occurred_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">{actor?.full_name ?? actor?.email ?? "system"}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{l.action}</span></td>
                  <td className="px-4 py-3 text-xs">{cand ? `${cand.first_name} ${cand.last_name}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">{JSON.stringify(l.payload)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
