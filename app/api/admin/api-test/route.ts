export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAnthropicClient, AI_MODEL } from "@/lib/ai/client";
import { stripe } from "@/lib/stripe/client";

type ProbeResult = {
  service: string;
  status: "ok" | "error" | "not_configured";
  latency_ms: number;
  detail: string;
};

async function time<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const start = Date.now();
  const value = await fn();
  return { value, ms: Date.now() - start };
}

async function probeSupabase(): Promise<ProbeResult> {
  try {
    const { ms } = await time(async () => {
      const { error } = await supabaseAdmin.from("tenants").select("id").limit(1);
      if (error) throw error;
    });
    return { service: "supabase", status: "ok", latency_ms: ms, detail: "DB reachable" };
  } catch (err) {
    return {
      service: "supabase",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeAnthropic(): Promise<ProbeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { service: "anthropic", status: "not_configured", latency_ms: 0, detail: "ANTHROPIC_API_KEY not set" };
  }
  try {
    const { value, ms } = await time(async () => {
      const client = getAnthropicClient();
      return client.messages.create({
        model: AI_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
    });
    return { service: "anthropic", status: "ok", latency_ms: ms, detail: `${value.model} (${value.usage.input_tokens}→${value.usage.output_tokens} tok)` };
  } catch (err) {
    return {
      service: "anthropic",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeOpenAI(): Promise<ProbeResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { service: "openai", status: "not_configured", latency_ms: 0, detail: "OPENAI_API_KEY not set" };
  }
  try {
    const { value, ms } = await time(async () => {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ data: Array<{ id: string }> }>;
    });
    return { service: "openai", status: "ok", latency_ms: ms, detail: `${value.data.length} models available` };
  } catch (err) {
    return {
      service: "openai",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeStripe(): Promise<ProbeResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { service: "stripe", status: "not_configured", latency_ms: 0, detail: "STRIPE_SECRET_KEY not set" };
  }
  try {
    const { value, ms } = await time(async () => stripe.balance.retrieve());
    const mode = process.env.STRIPE_SECRET_KEY.startsWith("sk_live") ? "Live" : "Test";
    const available = value.available[0];
    return { service: "stripe", status: "ok", latency_ms: ms, detail: `${mode} mode, ${available?.currency?.toUpperCase() ?? "USD"} balance OK` };
  } catch (err) {
    return {
      service: "stripe",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeHighLevel(): Promise<ProbeResult> {
  const apiKey = process.env.HL_API_KEY;
  const locationId = process.env.HL_LOCATION_ID;
  if (!apiKey) {
    return { service: "highlevel", status: "not_configured", latency_ms: 0, detail: "HL_API_KEY not set" };
  }
  const isPIT = apiKey.startsWith("pit-");
  try {
    const { value, ms } = await time(async () => {
      const url = isPIT
        ? `https://services.leadconnectorhq.com/locations/${locationId}`
        : `https://rest.gohighlevel.com/v1/locations/${locationId}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (isPIT) headers["Version"] = "2021-07-28";
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().then((t) => t.slice(0, 120))}`);
      return res.json() as Promise<{ location?: { name?: string }; name?: string }>;
    });
    const name = value.location?.name ?? value.name ?? "unknown";
    return { service: "highlevel", status: "ok", latency_ms: ms, detail: `${isPIT ? "v2 (PIT)" : "v1"} — location: ${name}` };
  } catch (err) {
    return {
      service: "highlevel",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeResend(): Promise<ProbeResult> {
  if (!process.env.RESEND_API_KEY) {
    return { service: "resend", status: "not_configured", latency_ms: 0, detail: "RESEND_API_KEY not set" };
  }
  try {
    const { value, ms } = await time(async () => {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<{ data: Array<{ name: string; status: string }> }>;
    });
    const verified = value.data?.filter((d) => d.status === "verified").length ?? 0;
    return { service: "resend", status: "ok", latency_ms: ms, detail: `${verified}/${value.data?.length ?? 0} domains verified` };
  } catch (err) {
    return {
      service: "resend",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// LIFT subsystem probes — reach the tables + cron audit rows shipped in
// migrations 037-040. Not endpoint smoke tests; these surface aggregate
// system state so a platform admin can eyeball cross-tenant health.

async function probeDefensibleLanguage(): Promise<ProbeResult> {
  try {
    const { value, ms } = await time(async () => {
      const { count: cachedCount, error: err1 } = await supabaseAdmin
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .not("defensible_language_updated_at", "is", null);
      if (err1) throw err1;
      const { data: modelRows, error: err2 } = await supabaseAdmin
        .from("candidates")
        .select("defensible_language_model")
        .not("defensible_language_model", "is", null)
        .limit(1000);
      if (err2) throw err2;
      const models = new Set<string>();
      for (const r of modelRows ?? []) {
        if (r.defensible_language_model) models.add(r.defensible_language_model);
      }
      return { cachedCount: cachedCount ?? 0, models: Array.from(models) };
    });
    const modelLabel =
      value.models.length === 0
        ? "no model observed yet"
        : value.models.length === 1
        ? value.models[0]
        : `${value.models.length} models in use`;
    return {
      service: "defensible_language",
      status: "ok",
      latency_ms: ms,
      detail: `${value.cachedCount} candidates with cached language · ${modelLabel}`,
    };
  } catch (err) {
    return {
      service: "defensible_language",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeCommitteeSessions(): Promise<ProbeResult> {
  try {
    const { value, ms } = await time(async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const [activeRes, staleRes, stagedRes, lastWarnRes] = await Promise.all([
        supabaseAdmin
          .from("committee_sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabaseAdmin
          .from("committee_sessions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .lt("started_at", fourteenDaysAgo),
        supabaseAdmin
          .from("committee_votes")
          .select("id", { count: "exact", head: true })
          .eq("status", "staged"),
        supabaseAdmin
          .from("audit_logs")
          .select("created_at")
          .eq("action", "committee_session.orphan_warned")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (activeRes.error) throw activeRes.error;
      if (staleRes.error) throw staleRes.error;
      if (stagedRes.error) throw stagedRes.error;
      return {
        activeCount: activeRes.count ?? 0,
        staleCount: staleRes.count ?? 0,
        stagedVoteCount: stagedRes.count ?? 0,
        lastWarn: lastWarnRes.data?.created_at ?? null,
      };
    });
    const lastWarnText = value.lastWarn
      ? `last orphan warning ${new Date(value.lastWarn).toISOString().slice(0, 10)}`
      : "no orphan warnings yet";
    return {
      service: "committee_sessions",
      status: "ok",
      latency_ms: ms,
      detail: `${value.activeCount} active (${value.staleCount} >14d) · ${value.stagedVoteCount} staged votes · ${lastWarnText}`,
    };
  } catch (err) {
    return {
      service: "committee_sessions",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeEnrollmentFlags(): Promise<ProbeResult> {
  try {
    const { value, ms } = await time(async () => {
      const [activeRes, notableRes, lastRunRes] = await Promise.all([
        supabaseAdmin
          .from("candidate_flags")
          .select("id", { count: "exact", head: true })
          .is("resolved_at", null),
        supabaseAdmin
          .from("candidate_flags")
          .select("id", { count: "exact", head: true })
          .is("resolved_at", null)
          .eq("severity", "notable"),
        supabaseAdmin
          .from("audit_logs")
          .select("created_at, payload")
          .eq("action", "enrollment_readiness_flags.evaluator_run")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (activeRes.error) throw activeRes.error;
      if (notableRes.error) throw notableRes.error;
      return {
        activeCount: activeRes.count ?? 0,
        notableCount: notableRes.count ?? 0,
        lastRun: lastRunRes.data,
      };
    });
    let runText = "cron has not run yet";
    if (value.lastRun) {
      const when = new Date(value.lastRun.created_at as string);
      const hoursAgo = Math.round((Date.now() - when.getTime()) / (60 * 60 * 1000));
      const p = (value.lastRun.payload ?? {}) as Record<string, number>;
      runText = `last run ${hoursAgo}h ago · ${p.tenants_processed ?? 0} processed, ${p.tenants_skipped ?? 0} skipped, ${p.flags_raised ?? 0} raised`;
    }
    return {
      service: "enrollment_flags",
      status: "ok",
      latency_ms: ms,
      detail: `${value.activeCount} active (${value.notableCount} notable) · ${runText}`,
    };
  } catch (err) {
    return {
      service: "enrollment_flags",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function probeMissionStatements(): Promise<ProbeResult> {
  try {
    const { value, ms } = await time(async () => {
      const [totalRes, setRes] = await Promise.all([
        supabaseAdmin.from("tenants").select("id", { count: "exact", head: true }),
        supabaseAdmin
          .from("tenant_settings")
          .select("tenant_id", { count: "exact", head: true })
          .not("mission_statement", "is", null)
          .neq("mission_statement", ""),
      ]);
      if (totalRes.error) throw totalRes.error;
      if (setRes.error) throw setRes.error;
      return { totalTenants: totalRes.count ?? 0, withMission: setRes.count ?? 0 };
    });
    const pct = value.totalTenants === 0 ? 0 : Math.round((value.withMission / value.totalTenants) * 100);
    return {
      service: "mission_statements",
      status: "ok",
      latency_ms: ms,
      detail: `${value.withMission}/${value.totalTenants} tenants have a mission statement (${pct}%)`,
    };
  } catch (err) {
    return {
      service: "mission_statements",
      status: "error",
      latency_ms: 0,
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

const PROBES: Record<string, () => Promise<ProbeResult>> = {
  supabase: probeSupabase,
  anthropic: probeAnthropic,
  openai: probeOpenAI,
  stripe: probeStripe,
  highlevel: probeHighLevel,
  resend: probeResend,
  defensible_language: probeDefensibleLanguage,
  committee_sessions: probeCommitteeSessions,
  enrollment_flags: probeEnrollmentFlags,
  mission_statements: probeMissionStatements,
};

export async function GET(req: NextRequest) {
  const { isPlatformAdmin } = await getTenantContext();
  if (!isPlatformAdmin) {
    return NextResponse.json({ error: "Platform admin only" }, { status: 403 });
  }

  const service = req.nextUrl.searchParams.get("service");

  if (service && PROBES[service]) {
    const result = await PROBES[service]();
    return NextResponse.json(result);
  }

  if (service === "all" || !service) {
    const results = await Promise.all(Object.values(PROBES).map((fn) => fn()));
    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
}
