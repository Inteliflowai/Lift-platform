"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

type UserRole = {
  id: string;
  role: string;
  granted_at: string;
  users: { id: string; email: string; full_name: string | null } | null;
};

const ALL_ROLES = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "school_admin", label: "School Admin" },
  { value: "evaluator", label: "Evaluator" },
  { value: "interviewer", label: "Interviewer" },
  { value: "grade_dean", label: "Grade Dean" },
  { value: "learning_specialist", label: "Learning Specialist" },
];

export function UserRolesEditor({ users }: { users: UserRole[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [changing, setChanging] = useState<string | null>(null);

  async function handleChangeRole(roleId: string, newRole: string) {
    setChanging(roleId);
    const res = await fetch("/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId, new_role: newRole }),
    });
    if (res.ok) {
      toast("Role updated");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({ error: "Failed" }));
      toast(data.error || "Failed to update role", "error");
    }
    setChanging(null);
  }

  async function handleRemoveRole(roleId: string) {
    if (!confirm("Remove this role? The user will lose access.")) return;
    setChanging(roleId);
    const res = await fetch(`/api/admin/roles?role_id=${roleId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast("Role removed");
      router.refresh();
    } else {
      toast("Failed to remove role", "error");
    }
    setChanging(null);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Granted</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lift-border">
          {users.map((u) => {
            const profile = u.users as { email: string; full_name: string | null } | null;
            return (
              <tr key={u.id}>
                <td className="py-2">{profile?.full_name || "—"}</td>
                <td className="py-2 text-muted">{profile?.email}</td>
                <td className="py-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleChangeRole(u.id, e.target.value)}
                    disabled={changing === u.id}
                    className="rounded-md border border-lift-border bg-page-bg px-2 py-1 text-xs text-lift-text outline-none focus:border-primary disabled:opacity-50"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 text-muted">
                  {new Date(u.granted_at).toLocaleDateString()}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => handleRemoveRole(u.id)}
                    disabled={changing === u.id}
                    className="text-xs text-review hover:text-review/80 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            );
          })}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-sm text-muted">
                No users assigned to this school.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
