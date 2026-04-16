"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, EmptyTeamIcon } from "@/components/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/ui/Toast";

type Member = {
  id: string;
  role: string;
  granted_at: string;
  users: { id: string; email: string; full_name: string | null }[] | { id: string; email: string; full_name: string | null } | null;
};

export function TeamClient({ members }: { members: Member[] }) {
  const router = useRouter();
  const { t } = useLocale();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("evaluator");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const { toast } = useToast();

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
      try {
        const data = await res.json();
        setError(data.error || "Failed to invite");
      } catch {
        setError(`Failed to invite (${res.status})`);
      }
      setLoading(false);
      return;
    }

    setSuccess(`Invitation sent to ${email}`);
    setEmail("");
    setLoading(false);
    router.refresh();
  }

  async function handleUpdateEmail(roleId: string) {
    if (!editEmail.trim()) return;
    const res = await fetch(`/api/school/team/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: editEmail.trim() }),
    });
    if (res.ok) {
      toast("Email updated");
      setEditingId(null);
      setEditEmail("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Failed" }));
      toast(data.error || "Failed to update email", "error");
    }
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
                  <td className="px-4 py-3 text-muted">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleUpdateEmail(m.id); if (e.key === "Escape") setEditingId(null); }}
                          className="w-48 rounded border border-primary bg-page-bg px-2 py-1 text-xs text-lift-text outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateEmail(m.id)} className="text-xs font-medium text-success">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-muted">Cancel</button>
                      </div>
                    ) : (
                      <span className="group">
                        {profile?.email}
                        <button
                          onClick={() => { setEditingId(m.id); setEditEmail(profile?.email || ""); }}
                          className="ml-2 text-[10px] text-primary opacity-0 group-hover:opacity-100"
                        >
                          Edit
                        </button>
                      </span>
                    )}
                  </td>
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
                <td colSpan={5}>
                  <EmptyState
                    icon={<EmptyTeamIcon />}
                    title={t("team.empty_title")}
                    description={t("team.empty_desc")}
                    action={{ label: t("team.empty_action"), href: "/school/team" }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
