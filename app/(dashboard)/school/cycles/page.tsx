import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function CyclesPage() {
  const { tenantId } = await getTenantContext();

  const { data: cycles } = await supabaseAdmin
    .from("application_cycles")
    .select("*, candidates(count)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Application Cycles</h1>
        <Link
          href="/school/cycles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          New Cycle
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Year</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Candidates</th>
              <th className="px-4 py-3 font-medium">Opens</th>
              <th className="px-4 py-3 font-medium">Closes</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {cycles?.map((c) => {
              const count =
                (c.candidates as unknown as { count: number }[])?.[0]?.count ?? 0;
              return (
                <tr key={c.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.academic_year}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "active"
                          ? "bg-success/10 text-success"
                          : c.status === "draft"
                          ? "bg-muted/10 text-muted"
                          : c.status === "closed"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted/10 text-muted"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{count}</td>
                  <td className="px-4 py-3 text-muted">
                    {c.opens_at
                      ? new Date(c.opens_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.closes_at
                      ? new Date(c.closes_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/school/cycles/${c.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {(!cycles || cycles.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No cycles yet. Create your first cycle to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
