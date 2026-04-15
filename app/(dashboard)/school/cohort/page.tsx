import { getTenantContext } from "@/lib/tenant";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { CohortClient } from "./cohort-client";

export const dynamic = "force-dynamic";

export default async function CohortPage() {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.COHORT_VIEW);

  return <CohortClient />;
}
