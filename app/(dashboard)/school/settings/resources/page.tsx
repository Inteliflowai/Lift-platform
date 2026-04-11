import { getTenantContext } from "@/lib/tenant";
import { checkFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { redirect } from "next/navigation";
import { ResourcesClient } from "./resources-client";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const { tenantId } = await getTenantContext();

  const hasFeature = await checkFeature(tenantId, FEATURES.PLACEMENT_SUPPORT_PLAN);
  if (!hasFeature) {
    redirect("/school/settings");
  }

  return <ResourcesClient />;
}
