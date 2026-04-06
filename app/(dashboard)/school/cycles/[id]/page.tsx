import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { CycleDetailClient } from "./cycle-detail-client";

export default async function CycleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { tenantId } = await getTenantContext();

  const [cycleRes, bandsRes, candidatesRes] = await Promise.all([
    supabaseAdmin
      .from("application_cycles")
      .select("*")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .single(),
    supabaseAdmin
      .from("grade_band_templates")
      .select("*")
      .eq("cycle_id", params.id)
      .eq("tenant_id", tenantId)
      .order("grade_band"),
    supabaseAdmin
      .from("candidates")
      .select("id, first_name, last_name, grade_band, status, created_at")
      .eq("cycle_id", params.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
  ]);

  if (cycleRes.error || !cycleRes.data) notFound();

  return (
    <CycleDetailClient
      cycle={cycleRes.data}
      gradeBands={bandsRes.data ?? []}
      candidates={candidatesRes.data ?? []}
    />
  );
}
