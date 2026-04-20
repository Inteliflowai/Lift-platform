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

const PROBES: Record<string, () => Promise<ProbeResult>> = {
  supabase: probeSupabase,
  anthropic: probeAnthropic,
  openai: probeOpenAI,
  stripe: probeStripe,
  highlevel: probeHighLevel,
  resend: probeResend,
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
