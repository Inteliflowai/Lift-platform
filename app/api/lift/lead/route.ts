import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rateLimit/middleware";
import { captureHLLead } from "@/lib/highlevel/capture";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = [
  "https://lift.inteliflowai.com",
  "https://www.lift.inteliflowai.com",
  "https://admissions.inteliflowai.com",
  "http://localhost:3000",
];

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`lift-lead:${ip}`, 5, 3600)) {
    return rateLimitResponse() as unknown as NextResponse;
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body?.website) {
    return NextResponse.json({ success: true });
  }

  if (!body?.email || typeof body.email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  try {
    const { contactId } = await captureHLLead(body);
    return NextResponse.json({ success: true, contactId });
  } catch (err) {
    console.error("lift lead capture failed:", err);
    return NextResponse.json({ error: "Capture failed" }, { status: 500 });
  }
}
