import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getLicense, getTrialDaysRemaining } from "@/lib/licensing/resolver";
import { checkSessionLimit } from "@/lib/licensing/gate";
import { SubscriptionClient } from "./subscription-client";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const { tenantId } = await getTenantContext();

  const license = await getLicense(tenantId).catch(() => null);
  const sessionInfo = await checkSessionLimit(tenantId).catch(() => ({
    allowed: true,
    used: 0,
    limit: 25,
  }));

  // Get evaluator seat count
  const { data: evaluators } = await supabaseAdmin
    .from("user_tenant_roles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("role", "evaluator");

  // Get pending upgrade request
  const { data: pendingRequest } = await supabaseAdmin
    .from("upgrade_requests")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <SubscriptionClient
      tier={license?.tier ?? "trial"}
      status={license?.status ?? "trialing"}
      trialDaysRemaining={license ? getTrialDaysRemaining(license) : 30}
      currentPeriodEndsAt={license?.current_period_ends_at ?? null}
      sessionsUsed={sessionInfo.used}
      sessionsLimit={sessionInfo.limit}
      evaluatorSeatsUsed={evaluators?.length ?? 0}
      hasPendingRequest={!!pendingRequest}
    />
  );
}
