import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  await supabaseAdmin
    .from("demo_sessions")
    .update({ converted_to_trial: true, converted_at: new Date().toISOString() })
    .eq("token", token);

  return NextResponse.json({ success: true });
}
