import { SessionClient } from "./session-client";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CommitteeSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const { tenantId } = await getTenantContext();

  const { data: session } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, tenant_id")
    .eq("id", params.id)
    .single();

  if (!session || session.tenant_id !== tenantId) {
    redirect("/school/briefing");
  }

  return <SessionClient sessionId={params.id} />;
}
