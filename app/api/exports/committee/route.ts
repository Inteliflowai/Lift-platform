export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireFeature } from "@/lib/licensing/gate";
import { FEATURES } from "@/lib/licensing/features";
import { generateCommitteeNarrative } from "@/lib/ai/committeeNarrative";
import type { CommitteeReportData } from "@/lib/ai/committeeNarrative";

const DIM_LABELS: Record<string, string> = {
  reading: "Reading Interpretation",
  writing: "Written Expression",
  reasoning: "Reasoning & Problem Solving",
  math: "Mathematical Reasoning",
  reflection: "Reflection & Metacognition",
  persistence: "Task Persistence",
  support_seeking: "Academic Self-Advocacy",
};

const DIMS = ["reading", "writing", "reasoning", "math", "reflection", "persistence", "support_seeking"] as const;

function getColor(s: number): string {
  return s >= 75 ? "#10b981" : s >= 50 ? "#6366f1" : "#f59e0b";
}

function getLabel(s: number): string {
  return s >= 75 ? "Strong" : s >= 50 ? "Developing" : "Emerging";
}

export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantContext();
  await requireFeature(tenantId, FEATURES.COMMITTEE_REPORT);

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  // Fetch candidate
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  // Fetch tenant
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  // Fetch tenant settings for branding
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("logo_url, wl_primary_color, wl_logo_dark_url")
    .eq("tenant_id", tenantId)
    .single();

  // Fetch insight profile
  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*, learning_support_signal_id")
    .eq("candidate_id", candidateId)
    .eq("tenant_id", tenantId)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No insight profile found" }, { status: 404 });
  }

  // Fetch completed session for date
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, completed_at")
    .eq("candidate_id", candidateId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch learning support signals
  let signalCount = 0;
  let hasNotableSignals = false;
  if (profile.learning_support_signal_id) {
    const { data: lss } = await supabaseAdmin
      .from("learning_support_signals")
      .select("signal_count, has_notable_signals")
      .eq("id", profile.learning_support_signal_id)
      .single();
    signalCount = lss?.signal_count ?? 0;
    hasNotableSignals = lss?.has_notable_signals ?? false;
  }

  // Fetch latest rubric submission
  const { data: rubric } = await supabaseAdmin
    .from("interview_rubric_submissions")
    .select("verbal_reasoning_score, communication_score, self_awareness_score, curiosity_score, resilience_score, recommendation, overall_impression")
    .eq("candidate_id", candidateId)
    .eq("tenant_id", tenantId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch interview synthesis
  const { data: synthesis } = await supabaseAdmin
    .from("interview_syntheses")
    .select("synthesis_narrative")
    .eq("candidate_id", candidateId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch re-application data
  const { data: reapp } = await supabaseAdmin
    .from("reapplication_records")
    .select("prior_tri_score")
    .eq("candidate_id", candidateId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  // Build dimension scores
  const dimScores = DIMS.map((d) => ({
    key: d,
    label: DIM_LABELS[d],
    score: Number(profile[`${d}_score`]) || 0,
  })).sort((a, b) => b.score - a.score);

  const topStrengths = dimScores.slice(0, 2).map((d) => d.label);
  const developingAreas = dimScores.slice(-2).map((d) => d.label);

  const triScore = Number(profile.tri_score) || 0;
  const isReapplicant = !!reapp?.prior_tri_score;
  const priorTri = Number(reapp?.prior_tri_score) || 0;
  const triChange = isReapplicant ? triScore - priorTri : undefined;

  // Generate AI narrative
  const narrativeData: CommitteeReportData = {
    candidateName: `${candidate.first_name} ${candidate.last_name}`,
    candidateFirstName: candidate.first_name,
    gradeApplyingFor: candidate.grade_applying_to || candidate.grade_band,
    schoolName: tenant?.name || "Our School",
    triScore,
    topStrengths,
    developingAreas,
    signalCount,
    rubricRecommendation: rubric?.recommendation ?? undefined,
    synthesisNarrative: synthesis?.synthesis_narrative ?? undefined,
    isReapplicant,
    priorTriScore: priorTri || undefined,
    triChange,
  };

  let narrative: string;
  try {
    narrative = await generateCommitteeNarrative(narrativeData);
  } catch (err) {
    console.error("[committee-report] Narrative generation failed:", err);
    narrative = "Committee narrative could not be generated. Please refer to the dimension scores and evaluator notes above.";
  }

  // Defensible decision language — show all three versions for committee deliberation
  const escapeHtml = (s: string): string =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const dlCache = (candidate.defensible_language_cache ?? {}) as {
    admit?: string;
    waitlist?: string;
    decline?: string;
    fallback_used?: boolean;
    edited_versions?: Array<{ decision: "admit" | "waitlist" | "decline"; text: string; ts: string }>;
  };
  const latestEdit = (decision: "admit" | "waitlist" | "decline"): string | null => {
    const edits = (dlCache.edited_versions ?? []).filter((e) => e.decision === decision);
    return edits.length > 0 ? edits[edits.length - 1].text : null;
  };
  const dlAdmit = latestEdit("admit") ?? dlCache.admit ?? "";
  const dlWaitlist = latestEdit("waitlist") ?? dlCache.waitlist ?? "";
  const dlDecline = latestEdit("decline") ?? dlCache.decline ?? "";
  const hasAnyLanguage = !!(dlAdmit || dlWaitlist || dlDecline);

  const decisionLanguageSection = hasAnyLanguage
    ? `<div class="narrative-section">
    <div class="narrative-label">Decision Language (all three versions)</div>
    ${dlCache.fallback_used ? `<div style="margin:8px 0 12px; padding:10px 12px; background:#fff4e5; border:1px solid #f59e0b; border-radius:6px; font-size:11px; color:#92400e;"><strong>Safe template used.</strong> Review before sending — AI generation did not pass content guardrails on at least one version.</div>` : ""}
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin:10px 0 18px;">
      <div style="border:1px solid #d1fae5; border-radius:6px; padding:12px; background:#ecfdf5;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#047857; margin-bottom:6px;">Admit</div>
        <p style="font-size:12px; line-height:1.55; color:#064e3b; margin:0;">${escapeHtml(dlAdmit || "Not generated.")}</p>
      </div>
      <div style="border:1px solid #fde68a; border-radius:6px; padding:12px; background:#fffbeb;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#b45309; margin-bottom:6px;">Waitlist</div>
        <p style="font-size:12px; line-height:1.55; color:#78350f; margin:0;">${escapeHtml(dlWaitlist || "Not generated.")}</p>
      </div>
      <div style="border:1px solid #fecaca; border-radius:6px; padding:12px; background:#fef2f2;">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#b91c1c; margin-bottom:6px;">Decline</div>
        <p style="font-size:12px; line-height:1.55; color:#7f1d1d; margin:0;">${escapeHtml(dlDecline || "Not generated.")}</p>
      </div>
    </div>
    <p style="font-size:10px; color:#78716c; margin:0 0 16px;">Pre-drafted for committee use. Not for external use until committee review is complete.</p>
  </div>`
    : "";

  // Build HTML
  const schoolName = tenant?.name || "Our School";
  const logoUrl = settings?.wl_logo_dark_url || settings?.logo_url || "";
  const primaryColor = settings?.wl_primary_color || "#2b1460";
  const candidateName = `${candidate.first_name} ${candidate.last_name}`;
  const initials = `${(candidate.first_name || "C")[0]}${(candidate.last_name || "C")[0]}`;
  const gradeLabel = candidate.grade_applying_to
    ? `Applying for Grade ${candidate.grade_applying_to}`
    : `Grade Band ${candidate.grade_band}`;
  const completedDate = session?.completed_at
    ? new Date(session.completed_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  const triColor = getColor(triScore);
  const triLabelText = getLabel(triScore) + " Readiness";

  // Rubric average
  let rubricAvg: number | null = null;
  if (rubric) {
    const scores = [
      rubric.verbal_reasoning_score,
      rubric.communication_score,
      rubric.self_awareness_score,
      rubric.curiosity_score,
      rubric.resilience_score,
    ].filter((s): s is number => s != null);
    if (scores.length > 0) {
      rubricAvg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    }
  }

  const html = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>Committee Report — ${candidateName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'DM Sans', Arial, sans-serif; background: #fff; color: #1c1917; font-size: 13px; line-height: 1.5; }
.page { max-width: 740px; margin: 0 auto; }
.hdr { background: ${primaryColor}; padding: 20px 36px; display: flex; align-items: center; justify-content: space-between; }
.hdr-logo { height: 44px; object-fit: contain; }
.hdr-right { text-align: right; color: rgba(255,255,255,0.8); font-size: 12px; line-height: 1.7; }
.hdr-right strong { color: #fff; font-size: 14px; display: block; }
.conf-bar { background: #f5f0ea; padding: 6px 36px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e8e3dc; }
.conf-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${primaryColor}; background: ${primaryColor}15; border: 1px solid ${primaryColor}30; padding: 2px 8px; border-radius: 20px; }
.conf-date { font-size: 11px; color: #a8a29e; }
.cand { padding: 20px 36px; display: flex; align-items: center; gap: 18px; border-bottom: 1px solid #e8e3dc; }
.cand-avatar { width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${primaryColor}, #6366f1); display: flex; align-items: center; justify-content: center; font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0; }
.cand-name { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: ${primaryColor}; margin-bottom: 2px; }
.cand-meta { font-size: 12px; color: #78716c; }
.tri-block { margin-left: auto; text-align: center; }
.tri-val { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 700; line-height: 1; }
.tri-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.reapp-badge { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 3px 10px; font-size: 11px; color: #6366f1; font-weight: 600; margin-top: 6px; display: inline-block; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid #e8e3dc; }
.col { padding: 18px 22px; }
.col:first-child { border-right: 1px solid #e8e3dc; }
.col-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6366f1; margin-bottom: 10px; }
.dim-row { margin-bottom: 7px; }
.dim-header { display: flex; justify-content: space-between; margin-bottom: 3px; }
.dim-name { font-size: 12px; color: #44403c; }
.dim-badge { font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 20px; }
.dim-bar-bg { height: 4px; background: #f0ebe4; border-radius: 2px; }
.dim-bar { height: 4px; border-radius: 2px; }
.signal-clear { color: #10b981; font-size: 13px; font-weight: 600; }
.signal-flag { background: #fffbeb; border: 1px solid #fde68a; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 8px 10px; font-size: 12px; color: #92400e; line-height: 1.6; }
.narrative-section { padding: 18px 22px 0; border-bottom: 1px solid #e8e3dc; }
.narrative-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #6366f1; margin-bottom: 10px; }
.narrative p { font-size: 13px; color: #292524; line-height: 1.75; margin-bottom: 10px; }
.narrative p:last-child { margin-bottom: 0; }
.ftr { padding: 14px 36px; display: flex; align-items: center; justify-content: space-between; background: #f5f0ea; border-top: 1px solid #e8e3dc; }
.ftr-left { font-size: 10px; color: #a8a29e; line-height: 1.6; }
.ftr-right { font-size: 10px; color: #a8a29e; text-align: right; }
@media print { body { background: #fff; } .page { max-width: 100%; } @page { margin: 0; size: A4; } }
</style></head><body>
<div class="page">
  <div class="hdr">
    ${logoUrl ? `<img src="${logoUrl}" alt="${schoolName}" class="hdr-logo" onerror="this.style.display='none'"/>` : `<span style="color:#fff;font-size:16px;font-weight:700;">${schoolName}</span>`}
    <div class="hdr-right">
      <strong>Admissions Committee Brief</strong>
      ${completedDate} &middot; LIFT Learning Readiness
    </div>
  </div>
  <div class="conf-bar">
    <span class="conf-badge">Confidential &mdash; Committee Use Only</span>
    <span class="conf-date">LIFT Non-Diagnostic Assessment</span>
  </div>
  <div class="cand">
    <div class="cand-avatar">${initials}</div>
    <div>
      <div class="cand-name">${candidateName}</div>
      <div class="cand-meta">${gradeLabel} &middot; ${schoolName}</div>
      ${isReapplicant ? `<span class="reapp-badge">Re-applicant &middot; Prior TRI: ${priorTri} &rarr; ${triScore} (${triChange !== undefined && triChange >= 0 ? "+" : ""}${triChange})</span>` : ""}
    </div>
    <div class="tri-block">
      <div class="tri-val" style="color:${triColor};">${triScore}</div>
      <div class="tri-lbl" style="color:${triColor};">${triLabelText}</div>
    </div>
  </div>
  <div class="two-col">
    <div class="col">
      <div class="col-label">Readiness Dimensions</div>
      ${dimScores.map((d) => `<div class="dim-row"><div class="dim-header"><span class="dim-name">${d.label}</span><span class="dim-badge" style="background:${getColor(d.score)}15;color:${getColor(d.score)};">${getLabel(d.score)}</span></div><div class="dim-bar-bg"><div class="dim-bar" style="width:${d.score}%;background:${getColor(d.score)};"></div></div></div>`).join("")}
    </div>
    <div class="col">
      <div class="col-label">Key Strengths</div>
      ${topStrengths.map((s) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div style="width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0;"></div><span style="font-size:12px;color:#1c1917;">${s}</span></div>`).join("")}
      <div style="margin-top:14px;">
        <div class="col-label">Areas Still Developing</div>
        ${developingAreas.map((s) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div style="width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div><span style="font-size:12px;color:#1c1917;">${s}</span></div>`).join("")}
      </div>
      <div style="margin-top:14px;">
        <div class="col-label">Learning Support</div>
        ${hasNotableSignals ? `<div class="signal-flag">&laquo; ${signalCount} behavioral pattern${signalCount > 1 ? "s" : ""} flagged for professional review. See full evaluator report for details.</div>` : `<span class="signal-clear">&check; No signals detected</span>`}
      </div>
      ${rubricAvg !== null ? `<div style="margin-top:14px;"><div class="col-label">Interview Score</div><div style="font-family:'Courier New',monospace;font-size:22px;font-weight:700;color:#6366f1;">${rubricAvg} / 5</div><div style="font-size:11px;color:#78716c;">Evaluator rubric average${rubric?.recommendation ? ` &middot; ${rubric.recommendation.replace(/_/g, " ")}` : ""}</div></div>` : ""}
    </div>
  </div>
  <div class="narrative-section">
    <div class="narrative-label">Committee Summary</div>
    <div class="narrative">
      ${narrative.split("\n\n").filter((p) => p.trim()).map((p) => `<p>${p.trim()}</p>`).join("")}
    </div>
    <div style="padding-bottom:18px;"></div>
  </div>
  ${decisionLanguageSection}
  <div class="ftr">
    <div class="ftr-left">
      <strong style="color:#1c1917;">${schoolName}</strong><br/>
      Prepared with LIFT &middot; AI-Powered Admissions Insight<br/>
      For committee use only &mdash; not for distribution to families
    </div>
    <div class="ftr-right">
      Non-diagnostic &middot; FERPA aligned<br/>
      Results require human review<br/>
      lift.inteliflowai.com
    </div>
  </div>
</div></body></html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
