export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import {
  isSessionOrphaned,
  shouldWarnAboutOrphan,
} from "@/lib/committee/staleSessionCheck";
import { sendCommitteeOrphanWarningEmail } from "@/lib/email";

// Nightly cron — finds committee sessions that have been active with staged
// votes for >14 days, emails the current host, writes an audit row. Idempotent
// within a 7-day re-warn cooldown (prevents nightly email spam).
//
// Auth: Vercel Cron sends a request with `authorization: Bearer ${CRON_SECRET}`
// when the `CRON_SECRET` env var is set. We verify that header.

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const FOURTEEN_DAYS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: candidateSessions, error } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, tenant_id, name, started_at, current_host_id, orphan_warned_at")
    .eq("status", "active")
    .lt("started_at", FOURTEEN_DAYS_AGO)
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!candidateSessions || candidateSessions.length === 0) {
    return NextResponse.json({ checked: 0, warned: 0 });
  }

  // Fetch staged vote counts per session in one query
  const sessionIds = candidateSessions.map((s) => s.id);
  const { data: stagedVotes } = await supabaseAdmin
    .from("committee_votes")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("status", "staged");
  const countBySession = new Map<string, number>();
  for (const v of stagedVotes ?? []) {
    countBySession.set(v.session_id, (countBySession.get(v.session_id) ?? 0) + 1);
  }

  let warnedCount = 0;

  for (const session of candidateSessions) {
    const stagedCount = countBySession.get(session.id) ?? 0;
    const orphaned = isSessionOrphaned({
      status: "active",
      startedAt: session.started_at,
      stagedVoteCount: stagedCount,
    });
    if (!orphaned) continue;

    if (!shouldWarnAboutOrphan({
      isOrphaned: true,
      lastWarnedAt: session.orphan_warned_at,
    })) continue;

    // Look up host email + tenant name
    const { data: host } = await supabaseAdmin
      .from("users")
      .select("email, first_name")
      .eq("id", session.current_host_id)
      .single();
    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("name")
      .eq("id", session.tenant_id)
      .single();

    if (!host?.email) continue;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lift.inteliflowai.com";
    const startedAtMs = new Date(session.started_at).getTime();
    const daysOpen = Math.floor((Date.now() - startedAtMs) / (1000 * 60 * 60 * 24));

    try {
      await sendCommitteeOrphanWarningEmail({
        to: host.email,
        hostFirstName: host.first_name ?? null,
        schoolName: tenant?.name ?? "your school",
        sessionName: session.name,
        stagedVoteCount: stagedCount,
        sessionDaysOpen: daysOpen,
        link: `${baseUrl}/school/briefing/session/${session.id}`,
      });
    } catch (err) {
      console.error("Orphan warning email failed for session", session.id, err);
      continue;
    }

    await supabaseAdmin
      .from("committee_sessions")
      .update({ orphan_warned_at: new Date().toISOString() })
      .eq("id", session.id);

    await writeAuditLog(supabaseAdmin, {
      tenant_id: session.tenant_id,
      actor_id: null,
      action: "committee_session.orphan_warned",
      payload: {
        session_id: session.id,
        host_email: host.email,
        staged_vote_count: stagedCount,
        days_open: daysOpen,
      },
    });

    warnedCount++;
  }

  return NextResponse.json({ checked: candidateSessions.length, warned: warnedCount });
}
