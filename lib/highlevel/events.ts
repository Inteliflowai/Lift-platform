import {
  upsertHLContact,
  addHLTags,
  removeHLTags,
  moveHLPipelineStage,
} from "./client";

const HL_STAGES: Record<string, string> = JSON.parse(
  process.env.HL_STAGE_IDS ?? "{}"
);

export async function syncLicenseEventToHL(event: {
  event_type: string;
  tenant_id: string;
  tenant_name: string;
  admin_email: string;
  admin_name: string;
  tier: string;
  school_type?: string;
  estimated_applicants?: string;
}): Promise<void> {
  if (!process.env.HL_API_KEY) return;

  const contactId = await upsertHLContact({
    email: event.admin_email,
    name: event.admin_name,
    companyName: event.tenant_name,
    source: "LIFT Platform",
    customField: {
      lift_tenant_id: event.tenant_id,
      lift_tier: event.tier,
      lift_school_type: event.school_type ?? "",
      lift_estimated_applicants: event.estimated_applicants ?? "",
    },
  });

  if (!contactId) return;

  switch (event.event_type) {
    case "trial_started":
      await addHLTags(contactId, ["lift-lead", "lift-trial"]);
      if (HL_STAGES["Trial Active"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Trial Active"]);
      }
      break;

    case "trial_expiring_soon":
      await addHLTags(contactId, ["lift-trial-ending"]);
      await removeHLTags(contactId, ["lift-trial"]);
      if (HL_STAGES["Trial Ending"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Trial Ending"]);
      }
      break;

    case "trial_expired":
      await addHLTags(contactId, ["lift-expired"]);
      await removeHLTags(contactId, ["lift-trial", "lift-trial-ending"]);
      if (HL_STAGES["Trial Expired"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Trial Expired"]);
      }
      break;

    case "tier_changed": {
      const tierTag = `lift-${event.tier}`;
      await addHLTags(contactId, ["lift-customer", tierTag]);
      await removeHLTags(contactId, [
        "lift-trial",
        "lift-trial-ending",
        "lift-expired",
      ]);
      const tierLabel = event.tier.charAt(0).toUpperCase() + event.tier.slice(1);
      // Try both "Customer — Tier" and "Customer-Tier" formats
      const stageId =
        HL_STAGES[`Customer — ${tierLabel}`] ??
        HL_STAGES[`Customer-${tierLabel}`] ??
        HL_STAGES[`Customer — ${event.tier}`] ??
        HL_STAGES[`Customer-${event.tier}`];
      if (stageId) {
        await moveHLPipelineStage(contactId, stageId);
      }
      break;
    }

    case "suspended":
      await addHLTags(contactId, ["lift-expired"]);
      if (HL_STAGES["Trial Expired"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Trial Expired"]);
      }
      break;

    case "cancelled":
      await addHLTags(contactId, ["lift-churned"]);
      await removeHLTags(contactId, ["lift-customer"]);
      if (HL_STAGES["Churned"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Churned"]);
      }
      break;

    case "session_limit_80pct":
      await addHLTags(contactId, ["lift-session-limit-warning"]);
      break;

    case "renewal_reminder":
      await addHLTags(contactId, ["lift-renewal-due"]);
      break;

    case "upgrade_requested":
      if (HL_STAGES["Negotiating"]) {
        await moveHLPipelineStage(contactId, HL_STAGES["Negotiating"]);
      }
      break;
  }
}
