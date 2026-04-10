export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
  // Verify logged-in user
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id } = await req.json();
  if (!session_id) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  // Call the internal pipeline route
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/pipeline/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_API_SECRET!,
    },
    body: JSON.stringify({ session_id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
