import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { EmptyState, EmptyCyclesIcon } from "@/components/EmptyState";
import { t } from "@/lib/i18n/useLocale";
import { CycleActions } from "./cycle-actions";

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
        <h1 className="text-2xl font-bold">{t("cycles.title")}</h1>
        <Link
          href="/school/cycles/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t("cycles.new")}
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("cycles.name_col")}</th>
              <th className="px-4 py-3 font-medium">{t("cycles.year_col")}</th>
              <th className="px-4 py-3 font-medium">{t("cycles.status_col")}</th>
              <th className="px-4 py-3 font-medium">{t("cycles.candidates_col")}</th>
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
                  <td className="px-4 py-3">
                    <CycleActions cycleId={c.id} candidateCount={count} status={c.status} />
                  </td>
                </tr>
              );
            })}
            {(!cycles || cycles.length === 0) && (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    icon={<EmptyCyclesIcon />}
                    title={t("cycles.empty_title")}
                    description={t("cycles.empty_desc")}
                    action={{ label: t("cycles.empty_action"), href: "/school/cycles/new" }}
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
