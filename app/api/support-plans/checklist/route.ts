export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getTenantContext();
  const { plan_id, item_id, completed } = await req.json();

  if (!plan_id || !item_id) {
    return NextResponse.json({ error: "plan_id and item_id required" }, { status: 400 });
  }

  // Fetch current plan
  const { data: plan, error: fetchErr } = await supabase
    .from("support_plans")
    .select("checklist_items")
    .eq("id", plan_id)
    .single();

  if (fetchErr || !plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const items = (plan.checklist_items as Record<string, unknown>[]) ?? [];
  const updated = items.map((item) => {
    if ((item as { id: string }).id === item_id) {
      return {
        ...item,
        completed: !!completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? user.id : null,
      };
    }
    return item;
  });

  const { data, error } = await supabase
    .from("support_plans")
    .update({ checklist_items: updated })
    .eq("id", plan_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
