import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { TrialHealthClient } from "./trial-health-client";

export const dynamic = "force-dynamic";

export default async function TrialHealthPage() {
  const { isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) redirect("/unauthorized");

  // Query the trial_health view
  const { data: trials } = await supabaseAdmin
    .from("trial_health")
    .select("*")
    .order("health_status", { ascending: true }) // at_risk first
    .order("days_remaining", { ascending: true });

  return <TrialHealthClient trials={trials ?? []} />;
}
