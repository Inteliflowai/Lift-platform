import { NextRequest, NextResponse } from "next/server";
import { upsertHLContact, addHLTags, moveHLPipelineStage } from "@/lib/highlevel/client";
import { sendUpgradeRequestEmail } from "@/lib/email";

function getHLStages(): Record<string, string> {
  try {
    return JSON.parse(process.env.HL_STAGE_IDS ?? "{}");
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-hl-secret");
  if (secret !== process.env.HL_INBOUND_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    first_name,
    last_name,
    email,
    school_name,
    role,
    school_type,
    estimated_applicants,
    message,
    form_type,
    source,
    tags,
  } = body;

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Upsert HL contact
  const contactId = await upsertHLContact({
    email,
    firstName: first_name,
    lastName: last_name,
    name: [first_name, last_name].filter(Boolean).join(" "),
    companyName: school_name,
    source: source || "LIFT Landing Page",
    customField: {
      lift_school_type: school_type ?? "",
      lift_estimated_applicants: estimated_applicants ?? "",
      lift_role: role ?? "",
    },
  });

  if (contactId) {
    // Add tags
    const allTags = ["lift-lead", ...(tags ?? [])];
    if (form_type) allTags.push(`lift-form-${form_type}`);
    await addHLTags(contactId, allTags);

    // Move to Demo Requested stage
    if (getHLStages()["Demo Requested"]) {
      await moveHLPipelineStage(contactId, getHLStages()["Demo Requested"]);
    }
  }

  // Send internal notification (fire-and-forget)
  sendUpgradeRequestEmail({
    schoolName: school_name ?? "Unknown School",
    currentTier: "lead",
    requestedTier: form_type ?? "demo",
    billingPreference: "",
    adminName: [first_name, last_name].filter(Boolean).join(" "),
    adminEmail: email,
    message: message ?? null,
    tenantId: "",
  }).catch((err) => console.error("HL inbound notification email failed:", err));

  return NextResponse.json({ success: true, contactId });
}
