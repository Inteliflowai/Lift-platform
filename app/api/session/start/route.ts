import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveInviteToken } from "@/lib/token";
import { checkSessionLimit, incrementSessionUsage } from "@/lib/licensing/gate";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { token } = body;

  const result = await resolveInviteToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { candidate } = result;

  // Check if session already exists
  const { data: existing } = await supabaseAdmin
    .from("sessions")
    .select("*")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    // Load task instances
    const { data: taskInstances } = await supabaseAdmin
      .from("task_instances")
      .select("*, task_templates(*)")
      .eq("session_id", existing.id)
      .order("sequence_order");

    return NextResponse.json({ session: existing, taskInstances: taskInstances ?? [] });
  }

  // License gate: check session limit before creating new session
  const { allowed, used, limit } = await checkSessionLimit(candidate.tenant_id);
  if (!allowed) {
    return NextResponse.json(
      { error: "session_limit_reached", used, limit },
      { status: 402 }
    );
  }

  // Get grade band template
  const { data: template } = await supabaseAdmin
    .from("grade_band_templates")
    .select("*")
    .eq("tenant_id", candidate.tenant_id)
    .eq("grade_band", candidate.grade_band)
    .eq("is_default", true)
    .limit(1)
    .single();

  // Create session
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from("sessions")
    .insert({
      candidate_id: candidate.id,
      tenant_id: candidate.tenant_id,
      cycle_id: candidate.cycle_id,
      grade_band_template_id: template?.id ?? null,
      grade_band: candidate.grade_band,
      status: "not_started",
    })
    .select()
    .single();

  if (sessionErr) {
    return NextResponse.json({ error: sessionErr.message }, { status: 500 });
  }

  // Get task templates for this grade band and tenant
  const { data: templates } = await supabaseAdmin
    .from("task_templates")
    .select("*")
    .or(`tenant_id.eq.${candidate.tenant_id},tenant_id.is.null`)
    .eq("grade_band", candidate.grade_band)
    .eq("is_active", true)
    .order("created_at");

  // For task types with multiple templates, pick one randomly per type
  const byType = new Map<string, typeof templates>();
  for (const t of templates ?? []) {
    const list = byType.get(t.task_type) ?? [];
    list.push(t);
    byType.set(t.task_type, list);
  }
  const selected: NonNullable<typeof templates> = [];
  for (const [, typeTemplates] of Array.from(byType.entries())) {
    if (!typeTemplates || typeTemplates.length === 0) continue;
    // Pick one random template per task type
    const pick = typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
    selected.push(pick);
  }

  // Shuffle selected templates (Fisher-Yates) so each candidate gets a random order
  const shuffled = [...selected];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Create task instances in shuffled order
  const instances = shuffled.map((t, i) => ({
    session_id: session.id,
    tenant_id: candidate.tenant_id,
    task_template_id: t.id,
    sequence_order: i + 1,
    status: "pending" as const,
  }));

  let taskInstances: unknown[] = [];
  if (instances.length > 0) {
    const { data } = await supabaseAdmin
      .from("task_instances")
      .insert(instances)
      .select("*, task_templates(*)");
    taskInstances = data ?? [];
  }

  // Increment session usage for licensing
  await incrementSessionUsage(candidate.tenant_id);

  // Record session event
  await supabaseAdmin.from("session_events").insert({
    session_id: session.id,
    tenant_id: candidate.tenant_id,
    event_type: "session_created",
  });

  return NextResponse.json({ session, taskInstances }, { status: 201 });
}
