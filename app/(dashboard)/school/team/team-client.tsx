"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  role: string;
  granted_at: string;
  users: { id: string; email: string; full_name: string | null }[] | { id: string; email: string; full_name: string | null } | null;
};

export function TeamClient({ members }: { members: Member[] }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("evaluator");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/school/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to invite");
      setLoading(false);
      return;
    }

    setSuccess(`Invitation sent to ${email}`);
    setEmail("");
    setLoading(false);
    router.refresh();
  }

  async function handleRevoke(roleId: string) {
    if (!confirm("Remove this team member's role?")) return;

    await fetch(`/api/school/team/${roleId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Invite Member
        </button>
      </div>

      {showInvite && (
        <div className="rounded-lg border border-lift-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-semibold">Invite New Team Member</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@school.edu"
              required
              className="flex-1 rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
            >
              <option value="evaluator">Evaluator</option>
              <option value="interviewer">Interviewer</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-review">{error}</p>}
          {success && <p className="mt-2 text-xs text-success">{success}</p>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Granted</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {members.map((m) => {
              const profile = m.users as unknown as {
                email: string;
                full_name: string | null;
              };
              return (
                <tr key={m.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    {profile?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{profile?.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(m.granted_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleRevoke(m.id)}
                      className="text-xs text-review hover:text-review/80"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              );
            })}
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
