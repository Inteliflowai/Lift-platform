export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { syncLicenseEventToHL } from "@/lib/highlevel/events";

/**
 * Daily nurture cron — finds trial tenants who haven't invited their first
 * candidate by day 3 or day 7 and fires HL tags. The actual emails are sent
 * by HL workflows wired to those tags (per feedback_b2b_buyer_nudge_channel:
 * activation nudges go to email, never to in-app banners for senior B2B
 * buyers).
 *
 * Idempotent — checks tenant_settings.nurture_tags_fired so each tag fires
 * at most once per tenant. Tenants who invite a real candidate before the
 * milestone never get tagged.
 *
 * Schedule: 11:00 UTC (1hr stagger after enrollment-readiness-flags-evaluate).
 */

type Milestone = {
  ageDays: number;
  eventType: "trial_no_invite_day3" | "trial_walkthrough_offer_day7";
  tag: string;
};

const MILESTONES: Milestone[] = [
  { ageDays: 3, eventType: "trial_no_invite_day3", tag: "day3_no_invite" },
  { ageDays: 7, eventType: "trial_walkthrough_offer_day7", tag: "day7_walkthrough_offer" },
];

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const provided = auth.startsWith("Bearer ")
      ? auth.slice("Bearer ".length)
      : "";
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Pull trialing tenants that started 3+ days ago. We'll filter per-milestone
  // in code so a single cron pass handles both day-3 and day-7.
  const oldestRelevant = new Date(
    Date.now() - 8 * 24 * 60 * 60 * 1000
  ).toISOString();
  const newestRelevant = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: licenses, error } = await supabaseAdmin
    .from("tenant_licenses")
    .select("tenant_id, trial_starts_at, trial_ends_at, status")
    .eq("status", "trialing")
    .gte("trial_starts_at", oldestRelevant)
    .lte("trial_starts_at", newestRelevant);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!licenses || licenses.length === 0) {
    return NextResponse.json({ checked: 0, fired: 0 });
  }

  const now = Date.now();
  let firedCount = 0;
  const skipped: { tenant_id: string; reason: string }[] = [];

  for (const license of licenses) {
    const ageMs = now - new Date(license.trial_starts_at).getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (new Date(license.trial_ends_at).getTime() < now) {
      skipped.push({ tenant_id: license.tenant_id, reason: "trial_expired" });
      continue;
    }

    // Did they already invite a real candidate? If so, don't nurture.
    const { data: invitedEvent } = await supabaseAdmin
      .from("trial_events")
      .select("event_type")
      .eq("tenant_id", license.tenant_id)
      .eq("event_type", "first_candidate_invited")
      .maybeSingle();

    if (invitedEvent) {
      skipped.push({
        tenant_id: license.tenant_id,
        reason: "already_invited",
      });
      continue;
    }

    // Read the bookkeeping ledger for this tenant. We persist fired tags on
    // tenant_settings so the cron can stay idempotent without a new table.
    const { data: settings } = await supabaseAdmin
      .from("tenant_settings")
      .select("nurture_tags_fired")
      .eq("tenant_id", license.tenant_id)
      .single();

    const alreadyFired: string[] = settings?.nurture_tags_fired ?? [];

    for (const milestone of MILESTONES) {
      if (ageDays < milestone.ageDays) continue;
      if (alreadyFired.includes(milestone.tag)) continue;

      // Look up the tenant + primary admin to feed HL.
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("name, school_type, expected_tier")
        .eq("id", license.tenant_id)
        .single();
      if (!tenant) continue;

      const { data: roleRow } = await supabaseAdmin
        .from("user_tenant_roles")
        .select("user_id")
        .eq("tenant_id", license.tenant_id)
        .eq("role", "school_admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!roleRow?.user_id) continue;

      const { data: admin } = await supabaseAdmin
        .from("users")
        .select("email, full_name")
        .eq("id", roleRow.user_id)
        .single();

      if (!admin?.email) continue;

      try {
        await syncLicenseEventToHL({
          event_type: milestone.eventType,
          tenant_id: license.tenant_id,
          tenant_name: tenant.name,
          admin_email: admin.email,
          admin_name: admin.full_name ?? admin.email,
          tier: "trial",
          school_type: tenant.school_type ?? undefined,
        });
      } catch (err) {
        console.error(
          "[trial-nurture] HL sync failed for",
          license.tenant_id,
          milestone.eventType,
          err
        );
        continue;
      }

      alreadyFired.push(milestone.tag);

      await supabaseAdmin
        .from("tenant_settings")
        .update({ nurture_tags_fired: alreadyFired })
        .eq("tenant_id", license.tenant_id);

      await writeAuditLog(supabaseAdmin, {
        tenant_id: license.tenant_id,
        actor_id: null,
        action: `trial_nurture.${milestone.eventType}`,
        payload: { age_days: ageDays },
      });

      firedCount++;
    }
  }

  return NextResponse.json({
    checked: licenses.length,
    fired: firedCount,
    skipped: skipped.length,
  });
}
