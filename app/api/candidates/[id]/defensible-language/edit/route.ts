export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { validateAgainstGuardrails } from "@/lib/ai/forbiddenPhrases";
import type {
  DefensibleLanguageCache,
  DecisionType,
} from "@/lib/ai/defensibleLanguage";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

// POST — save an edited version of the defensible language for one decision.
// Body: { decision: 'admit'|'waitlist'|'decline', text: string }
// The edited version is validated against the same forbidden-phrase guardrails
// as AI output — we don't let an edit re-introduce a forbidden phrase.
export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, roles, isPlatformAdmin } = await getTenantContext();
  const candidateId = context.params.id;

  const body = await req.json().catch(() => null);
  const decision = body?.decision as DecisionType | undefined;
  const text: string | undefined = body?.text;

  if (!decision || !["admit", "waitlist", "decline"].includes(decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
  }
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Text required" }, { status: 400 });
  }

  // Guardrail check — an edit must also pass.
  const check = validateAgainstGuardrails(text);
  if (!check.ok) {
    return NextResponse.json(
      {
        error: "Edit rejected by guardrail",
        rejected_phrase: check.rejected_phrase,
        category: check.category,
      },
      { status: 422 },
    );
  }

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, tenant_id, status, defensible_language_cache")
    .eq("id", candidateId)
    .single();

  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canEdit =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === candidate.tenant_id && ADMIN_ROLES.has(r.role));
  if (!canEdit) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const currentCache = (candidate.defensible_language_cache ?? {}) as Partial<DefensibleLanguageCache>;
  const edits = Array.isArray(currentCache.edited_versions)
    ? [...currentCache.edited_versions]
    : [];

  edits.push({
    decision,
    text: text.trim(),
    actor_id: user.id,
    ts: new Date().toISOString(),
  });

  await supabaseAdmin
    .from("candidates")
    .update({
      defensible_language_cache: {
        ...currentCache,
        edited_versions: edits,
      },
    })
    .eq("id", candidateId);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: candidate.tenant_id,
    actor_id: user.id,
    candidate_id: candidateId,
    action: "defensible_language.edited",
    payload: {
      decision,
      byte_length: text.length,
      candidate_status: candidate.status,
    },
  });

  return NextResponse.json({ ok: true, edit_count: edits.length });
}
