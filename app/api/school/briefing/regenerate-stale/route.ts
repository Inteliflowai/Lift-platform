export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min ceiling; expected usage well under 1 min

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { rateLimitCheck } from "@/lib/rateLimit/middleware";
import { findStaleLanguageCandidates } from "@/lib/director/staleLanguageDetection";
import { generateAndPersistDefensibleLanguage } from "@/lib/director/defensibleLanguagePersist";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);
const CLIENT_VISIBLE_CAP = 50;
const SERVER_BATCH_SIZE = 10;
const INTER_BATCH_SLEEP_MS = 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const canTrigger =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role));
  if (!canTrigger) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1 call per tenant per 60s — prevents accidental double-click stacking.
  const rl = rateLimitCheck(`briefing_regen:${tenantId}`, 1, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        message: "Another regeneration is in progress.",
        retry_after_seconds: rl.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  const body = await req.json().catch(() => ({}));
  const cycleId: string | null = body?.cycle_id ?? null;
  const dryRun: boolean = !!body?.dry_run;

  const stale = await findStaleLanguageCandidates(tenantId, {
    cycleId,
    limit: CLIENT_VISIBLE_CAP,
  });

  if (dryRun) {
    return NextResponse.json({
      total_stale: stale.length,
      estimated_minutes: Math.max(1, Math.ceil(stale.length / SERVER_BATCH_SIZE * 0.5)),
      batch_size: SERVER_BATCH_SIZE,
    });
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "defensible_language.bulk_regenerate_triggered",
    payload: {
      total_stale: stale.length,
      cycle_id: cycleId,
      batch_size: SERVER_BATCH_SIZE,
    },
  });

  let regenerated = 0;
  let failed = 0;
  const failedIds: string[] = [];

  // Batch of SERVER_BATCH_SIZE with Promise.allSettled. 500ms sleep between
  // batches to be polite to the Anthropic rate limit.
  for (let i = 0; i < stale.length; i += SERVER_BATCH_SIZE) {
    const batch = stale.slice(i, i + SERVER_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((c) =>
        generateAndPersistDefensibleLanguage({
          candidateId: c.id,
          actorId: user.id,
          trigger: "manual",
          respectDriftThreshold: false,
        }),
      ),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && !r.value.skipped) {
        regenerated++;
      } else {
        failed++;
        failedIds.push(batch[j].id);
      }
    }
    if (i + SERVER_BATCH_SIZE < stale.length) {
      await sleep(INTER_BATCH_SLEEP_MS);
    }
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "defensible_language.bulk_regenerate_completed",
    payload: {
      total_stale: stale.length,
      regenerated,
      failed,
      failed_candidate_ids: failedIds.slice(0, 20), // cap for audit-row size
    },
  });

  return NextResponse.json({
    total_stale: stale.length,
    regenerated,
    failed,
    batch_size: SERVER_BATCH_SIZE,
  });
}
