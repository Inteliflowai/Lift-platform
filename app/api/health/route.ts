import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {
    db: "error",
    ai: "error",
    email: "error",
  };

  // Check DB connection
  try {
    const { error } = await supabaseAdmin.from("tenants").select("id").limit(1);
    checks.db = error ? "error" : "ok";
  } catch {
    checks.db = "error";
  }

  // Check AI keys present
  checks.ai = process.env.ANTHROPIC_API_KEY ? "ok" : "error";

  // Check email config present
  checks.email =
    process.env.EMAIL_HOST && process.env.EMAIL_USER ? "ok" : "error";

  const allOk = Object.values(checks).every((v) => v === "ok");
  const anyOk = Object.values(checks).some((v) => v === "ok");

  const status = allOk ? "ok" : anyOk ? "degraded" : "critical";
  const httpStatus = allOk ? 200 : anyOk ? 207 : 503;

  return NextResponse.json(
    { status, checks, timestamp: new Date().toISOString() },
    { status: httpStatus }
  );
}
