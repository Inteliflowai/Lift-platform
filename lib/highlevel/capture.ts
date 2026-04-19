import { upsertHLContact, addHLTags, moveHLPipelineStage } from "@/lib/highlevel/client";
import { sendUpgradeRequestEmail } from "@/lib/email";

function getHLStages(): Record<string, string> {
  try {
    return JSON.parse(process.env.HL_STAGE_IDS ?? "{}");
  } catch {
    return {};
  }
}

export interface HLLeadInput {
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  school_name?: string;
  role?: string;
  school_type?: string;
  estimated_applicants?: string | number;
  message?: string;
  form_type?: string;
  source?: string;
  tags?: string[];
}

export async function captureHLLead(input: HLLeadInput): Promise<{ contactId: string | null }> {
  const {
    email,
    school_name,
    role,
    school_type,
    estimated_applicants,
    message,
    form_type,
    source,
    tags,
  } = input;

  let { first_name, last_name } = input;
  if ((!first_name || !last_name) && input.full_name) {
    const parts = input.full_name.trim().split(/\s+/);
    first_name = first_name || parts[0] || "";
    last_name = last_name || parts.slice(1).join(" ");
  }

  const contactId = await upsertHLContact({
    email,
    firstName: first_name,
    lastName: last_name,
    name: [first_name, last_name].filter(Boolean).join(" "),
    companyName: school_name,
    source: source || "LIFT Landing Page",
    customField: {
      lift_school_type: school_type ?? "",
      lift_estimated_applicants: String(estimated_applicants ?? ""),
      lift_role: role ?? "",
    },
  });

  if (contactId) {
    const allTags = ["lift-lead", ...(tags ?? [])];
    if (form_type) allTags.push(`lift-form-${form_type}`);
    await addHLTags(contactId, allTags);

    const stages = getHLStages();
    if (stages["Demo Requested"]) {
      await moveHLPipelineStage(contactId, stages["Demo Requested"]);
    }
  }

  sendUpgradeRequestEmail({
    schoolName: school_name ?? "Unknown School",
    currentTier: "lead",
    requestedTier: form_type ?? "demo",
    billingPreference: "",
    adminName: [first_name, last_name].filter(Boolean).join(" "),
    adminEmail: email,
    message: message ?? null,
    tenantId: "",
  }).catch((err) => console.error("HL lead notification email failed:", err));

  return { contactId };
}
