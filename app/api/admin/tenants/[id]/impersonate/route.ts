export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

import { cookies } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is platform_admin
  const { data: roles } = await supabase
    .from("user_tenant_roles")
    .select("role")
    .eq("user_id", user.id);

  const isPlatformAdmin = roles?.some((r) => r.role === "platform_admin");
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("lift_impersonate_tenant", params.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });
  cookieStore.set("lift_impersonate_role", "school_admin", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return NextResponse.json({ ok: true, tenant_id: params.id });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("lift_impersonate_tenant");
  cookieStore.delete("lift_impersonate_role");
  return NextResponse.json({ ok: true });
}
