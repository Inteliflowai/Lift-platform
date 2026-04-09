import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ImpersonateButton } from "./impersonate-button";
import { DemoControls } from "./demo-controls";

export default async function TenantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!tenant) notFound();

  const [settingsRes, usersRes, cyclesRes] = await Promise.all([
    supabaseAdmin
      .from("tenant_settings")
      .select("*")
      .eq("tenant_id", params.id)
      .single(),
    supabaseAdmin
      .from("user_tenant_roles")
      .select("id, role, granted_at, users(id, email, full_name)")
      .eq("tenant_id", params.id)
      .order("granted_at", { ascending: false }),
    supabaseAdmin
      .from("application_cycles")
      .select("*")
      .eq("tenant_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const settings = settingsRes.data;
  const users = usersRes.data ?? [];
  const cycles = cyclesRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-muted">/{tenant.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/tenants/${params.id}/reset`}
            className="rounded-md border border-warning/30 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/5"
          >
            Data Management
          </Link>
          <Link
            href={`/admin/licenses/${params.id}`}
            className="rounded-md border border-lift-border px-4 py-2 text-sm font-medium text-muted hover:bg-surface"
          >
            License
          </Link>
          <ImpersonateButton tenantId={params.id} />
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Settings</h2>
        {settings ? (
          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
            <div>
              <span className="text-muted">Language:</span>{" "}
              {settings.default_language}
            </div>
            <div>
              <span className="text-muted">COPPA:</span>{" "}
              {settings.coppa_mode ? "Enabled" : "Disabled"}
            </div>
            <div>
              <span className="text-muted">Pause:</span>{" "}
              {settings.session_pause_allowed
                ? `${settings.session_pause_limit_hours}h`
                : "Disabled"}
            </div>
            <div>
              <span className="text-muted">Retention:</span>{" "}
              {settings.data_retention_days} days
            </div>
            <div>
              <span className="text-muted">Always Review:</span>{" "}
              {settings.require_human_review_always ? "Yes" : "No"}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No settings configured.</p>
        )}
      </div>

      {/* Users */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
                <th className="pb-2 font-medium">Granted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {users.map((u) => {
                const profile = u.users as unknown as {
                  email: string;
                  full_name: string | null;
                };
                return (
                  <tr key={u.id}>
                    <td className="py-2">{profile?.full_name || "—"}</td>
                    <td className="py-2 text-muted">{profile?.email}</td>
                    <td className="py-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2 text-muted">
                      {new Date(u.granted_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cycles */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Cycles</h2>
        {cycles.length === 0 ? (
          <p className="text-sm text-muted">No cycles.</p>
        ) : (
          <div className="space-y-2">
            {cycles.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border border-lift-border p-3"
              >
                <div>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {c.academic_year}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "active"
                      ? "bg-success/10 text-success"
                      : c.status === "draft"
                      ? "bg-muted/10 text-muted"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Mode */}
      <DemoControls
        tenantId={params.id}
        isDemo={tenant.is_demo ?? false}
        demoActivatedAt={tenant.demo_activated_at}
        tenantName={tenant.name}
      />
    </div>
  );
}
