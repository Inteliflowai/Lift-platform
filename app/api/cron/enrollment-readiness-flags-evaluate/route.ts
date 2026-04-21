export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { evaluateTenant } from "@/lib/flags/evaluator";
import { checkFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";

// Nightly cron — evaluates enrollment readiness flags for every tenant that
// has ENROLLMENT_READINESS_FLAGS in its feature set. Each candidate in an
// eligible status gets a full catalog pass (7 flags). Audit emission on
// state-change events only (raised / escalated / resolved / auto_resolved);
// state-stable refreshes update the DB last_observed_at silently.

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find all tenants. Only evaluate those whose license currently includes
  // ENROLLMENT_READINESS_FLAGS — skipping saves compute and prevents flag
  // rows from being created in tenants whose UI doesn't surface them
  // (e.g. if a tier is ever downgraded).
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id");

  const summaries: Array<{
    tenant_id: string;
    candidates_evaluated: number;
    flags_raised: number;
    flags_escalated: number;
    flags_auto_resolved: number;
    flags_refreshed: number;
    errors: number;
  }> = [];
  let tenantsSkipped = 0;
  const now = new Date().toISOString();

  for (const t of tenants ?? []) {
    const enabled = await checkFeature(t.id, FEATURES.ENROLLMENT_READINESS_FLAGS);
    if (!enabled) {
      tenantsSkipped++;
      continue;
    }
    try {
      const summary = await evaluateTenant(t.id, now);
      summaries.push(summary);
    } catch (err) {
      console.error(`[flags] evaluateTenant failed for ${t.id}`, err);
      summaries.push({
        tenant_id: t.id,
        candidates_evaluated: 0,
        flags_raised: 0,
        flags_escalated: 0,
        flags_auto_resolved: 0,
        flags_refreshed: 0,
        errors: 1,
      });
    }
  }

  const totals = summaries.reduce(
    (acc, s) => ({
      tenants_processed: acc.tenants_processed + 1,
      tenants_skipped: acc.tenants_skipped,
      candidates_evaluated: acc.candidates_evaluated + s.candidates_evaluated,
      flags_raised: acc.flags_raised + s.flags_raised,
      flags_escalated: acc.flags_escalated + s.flags_escalated,
      flags_auto_resolved: acc.flags_auto_resolved + s.flags_auto_resolved,
      flags_refreshed: acc.flags_refreshed + s.flags_refreshed,
      errors: acc.errors + s.errors,
    }),
    {
      tenants_processed: 0,
      tenants_skipped: tenantsSkipped,
      candidates_evaluated: 0,
      flags_raised: 0,
      flags_escalated: 0,
      flags_auto_resolved: 0,
      flags_refreshed: 0,
      errors: 0,
    },
  );

  await writeAuditLog(supabaseAdmin, {
    tenant_id: null,
    actor_id: null,
    action: "enrollment_readiness_flags.evaluator_run",
    payload: totals,
  });

  return NextResponse.json(totals);
}
