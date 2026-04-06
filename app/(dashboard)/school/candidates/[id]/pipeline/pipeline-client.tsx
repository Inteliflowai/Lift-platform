"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Session = { id: string; status: string; completed_at: string | null };
type AiRun = {
  id: string;
  session_id: string;
  run_type: string;
  status: string;
  ran_at: string;
  ai_versions: { dimension: string; version_tag: string } | null;
};

export function PipelineClient({
  candidateName,
  sessions,
  aiRuns,
}: {
  candidateName: string;
  sessions: Session[];
  aiRuns: AiRun[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRerun(sessionId: string) {
    setRunning(sessionId);
    setError(null);

    const res = await fetch("/api/pipeline/rerun", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Pipeline failed");
    }

    setRunning(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Pipeline</h1>
        <p className="text-sm text-muted">{candidateName}</p>
      </div>

      {error && (
        <div className="rounded-md bg-review/10 p-3 text-sm text-review">
          {error}
        </div>
      )}

      {/* Sessions with re-run */}
      <div>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="mt-3 space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-lift-border p-3"
            >
              <div>
                <span className="text-sm font-mono">{s.id.slice(0, 8)}</span>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === "completed"
                      ? "bg-success/10 text-success"
                      : "bg-muted/10 text-muted"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {s.completed_at && (
                  <span className="text-xs text-muted">
                    {new Date(s.completed_at).toLocaleString()}
                  </span>
                )}
                {s.status === "completed" && (
                  <button
                    onClick={() => handleRerun(s.id)}
                    disabled={running === s.id}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {running === s.id ? "Running..." : "Re-run Pipeline"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Runs History */}
      <div>
        <h2 className="text-lg font-semibold">AI Runs History</h2>
        {aiRuns.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No AI runs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-lift-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-lift-border bg-surface text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Dimension</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ran At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {aiRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-mono text-xs">
                      {run.run_type}
                    </td>
                    <td className="px-4 py-3">
                      {run.ai_versions?.dimension ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {run.ai_versions?.version_tag ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          run.status === "complete"
                            ? "bg-success/10 text-success"
                            : run.status === "failed"
                            ? "bg-review/10 text-review"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {run.ran_at
                        ? new Date(run.ran_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
