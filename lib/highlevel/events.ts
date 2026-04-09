import {
  upsertHLContact,
  addHLTags,
  removeHLTags,
  moveHLPipelineStage,
} from "./client";

function getHLStages(): Record<string, string> {
  try {
    return JSON.parse(process.env.HL_STAGE_IDS ?? "{}");
  } catch {
    return {};
  }
}

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
      if (getHLStages()["Trial Active"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Trial Active"]);
      }
      break;

    case "trial_expiring_soon":
      await addHLTags(contactId, ["lift-trial-ending"]);
      await removeHLTags(contactId, ["lift-trial"]);
      if (getHLStages()["Trial Ending"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Trial Ending"]);
      }
      break;

    case "trial_expired":
      await addHLTags(contactId, ["lift-expired"]);
      await removeHLTags(contactId, ["lift-trial", "lift-trial-ending"]);
      if (getHLStages()["Trial Expired"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Trial Expired"]);
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
        getHLStages()[`Customer — ${tierLabel}`] ??
        getHLStages()[`Customer-${tierLabel}`] ??
        getHLStages()[`Customer — ${event.tier}`] ??
        getHLStages()[`Customer-${event.tier}`];
      if (stageId) {
        await moveHLPipelineStage(contactId, stageId);
      }
      break;
    }

    case "suspended":
      await addHLTags(contactId, ["lift-expired"]);
      if (getHLStages()["Trial Expired"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Trial Expired"]);
      }
      break;

    case "cancelled":
      await addHLTags(contactId, ["lift-churned"]);
      await removeHLTags(contactId, ["lift-customer"]);
      if (getHLStages()["Churned"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Churned"]);
      }
      break;

    case "session_limit_80pct":
      await addHLTags(contactId, ["lift-session-limit-warning"]);
      break;

    case "renewal_reminder":
      await addHLTags(contactId, ["lift-renewal-due"]);
      break;

    case "upgrade_requested":
      if (getHLStages()["Negotiating"]) {
        await moveHLPipelineStage(contactId, getHLStages()["Negotiating"]);
      }
      break;
  }
}
