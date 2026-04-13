export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { tooltipId } = await req.json();
  if (!tooltipId) return NextResponse.json({ error: "Missing tooltipId" }, { status: 400 });

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("tooltip_dismissals")
    .upsert({ user_id: user.id, tooltip_id: tooltipId }, { onConflict: "user_id,tooltip_id", ignoreDuplicates: true });

  return NextResponse.json({ success: true });
}
