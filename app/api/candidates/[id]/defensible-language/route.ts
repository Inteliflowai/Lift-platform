export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DefensibleLanguageCache } from "@/lib/ai/defensibleLanguage";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);
const READ_ROLES = new Set(["platform_admin", "school_admin", "evaluator"]);

// GET — read cached defensible language for the candidate.
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { roles, isPlatformAdmin } = await getTenantContext();
  const candidateId = context.params.id;

  const { data: candidate, error } = await supabaseAdmin
    .from("candidates")
    .select(
      "id, tenant_id, status, defensible_language_cache, defensible_language_updated_at, signal_snapshot_hash, defensible_language_model",
    )
    .eq("id", candidateId)
    .single();

  if (error || !candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const roleSet = new Set(roles.map((r) => r.role));
  const tenantMatch =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === candidate.tenant_id && READ_ROLES.has(r.role));
  if (!tenantMatch) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canEdit =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === candidate.tenant_id && ADMIN_ROLES.has(r.role));
  const isEvaluatorOnly =
    !canEdit && roleSet.has("evaluator");

  return NextResponse.json({
    candidate_id: candidate.id,
    status: candidate.status,
    cache: (candidate.defensible_language_cache ?? {}) as Partial<DefensibleLanguageCache>,
    updated_at: candidate.defensible_language_updated_at,
    model: candidate.defensible_language_model,
    signal_hash: candidate.signal_snapshot_hash,
    permissions: {
      can_view: true,
      can_copy: canEdit,
      can_edit: canEdit,
      can_download: canEdit,
      can_regenerate: canEdit,
      read_only_evaluator: isEvaluatorOnly,
    },
  });
}

// POST — manually regenerate defensible language for the candidate.
// Only school_admin + platform_admin.
export async function POST(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, roles, isPlatformAdmin } = await getTenantContext();
  const candidateId = context.params.id;

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, tenant_id")
    .eq("id", candidateId)
    .single();
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const canEdit =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === candidate.tenant_id && ADMIN_ROLES.has(r.role));
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { generateAndPersistDefensibleLanguage } = await import(
    "@/lib/director/defensibleLanguagePersist"
  );
  const result = await generateAndPersistDefensibleLanguage({
    candidateId,
    actorId: user.id,
    trigger: "manual",
    respectDriftThreshold: false,
  });

  if (result.skipped) {
    return NextResponse.json(
      { error: result.reason ?? "skipped" },
      { status: result.reason === "no_insight_profile" ? 409 : 400 },
    );
  }
  return NextResponse.json({ ok: true, cache: result.persisted });
}
