import { getTenantContext } from "@/lib/tenant";
import { checkFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { tenantId } = await getTenantContext();

  const hasFeature = await checkFeature(tenantId, FEATURES.SIS_INTEGRATIONS);
  if (!hasFeature) {
    redirect("/school/settings");
  }

  return <IntegrationsClient />;
}
