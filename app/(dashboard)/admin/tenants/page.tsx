import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { TenantActions } from "./tenant-actions";

export default async function TenantsPage() {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("*, candidates(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New Tenant
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Candidates</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {tenants?.map((t) => {
              const candidateCount =
                (t.candidates as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <tr key={t.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tenants/${t.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === "active"
                          ? "bg-success/10 text-success"
                          : t.status === "suspended"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{candidateCount}</td>
                  <td className="px-4 py-3">
                    <TenantActions tenantId={t.id} status={t.status} />
                  </td>
                </tr>
              );
            })}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No tenants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
