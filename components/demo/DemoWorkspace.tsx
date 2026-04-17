"use client";

import { useState, useEffect } from "react";
import { DemoBanner } from "./DemoBanner";
import { DemoTimer } from "./DemoTimer";
import { DemoExpiredModal } from "./DemoExpiredModal";
import { DemoUpgradeModal } from "./DemoUpgradeModal";

interface DemoCandidate {
  id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  insight_profiles: { tri_score: number; tri_label: string; reading_score: number; writing_score: number; reasoning_score: number; reflection_score: number; persistence_score: number; support_seeking_score: number; overall_confidence: number; internal_narrative: string | null; placement_guidance: string | null }[] | null;
  learning_support_signals: { support_indicator_level: string; enriched_signals: unknown[]; has_notable_signals: boolean }[] | null;
}

const getColor = (s: number) => s >= 75 ? "#10b981" : s >= 60 ? "#6366f1" : "#f59e0b";
const getLabel = (s: number) => s >= 75 ? "Strong" : s >= 60 ? "Developing" : "Emerging";

export function DemoWorkspace({ token, expiresAt, candidates }: { token: string; expiresAt: string; candidates: DemoCandidate[] }) {
  const [selected, setSelected] = useState<DemoCandidate | null>(candidates[0] ?? null);
  const [expired, setExpired] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeShown, setUpgradeShown] = useState(false);
  const [tab, setTab] = useState<"overview" | "intelligence" | "signals" | "reports">("overview");

  useEffect(() => {
    const check = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) setExpired(true);
      else if (ms <= 5 * 60 * 1000 && !upgradeShown) { setShowUpgrade(true); setUpgradeShown(true); }
    };
    check();
    const i = setInterval(check, 10000);
    return () => clearInterval(i);
  }, [expiresAt, upgradeShown]);

  const p = Array.isArray(selected?.insight_profiles) ? selected.insight_profiles[0] : null;
  const signals = Array.isArray(selected?.learning_support_signals) ? selected.learning_support_signals[0] : null;
  const enriched = (signals?.enriched_signals ?? []) as { id: string; label: string; severity: string; category: string; description: string; recommendation: string; evidenceSummary: string }[];

  const DIMS = p ? [
    { label: "Reading Interpretation", score: Number(p.reading_score) },
    { label: "Written Expression", score: Number(p.writing_score) },
    { label: "Reasoning & Problem Structuring", score: Number(p.reasoning_score) },
    { label: "Reflection & Metacognition", score: Number(p.reflection_score) },
    { label: "Task Persistence", score: Number(p.persistence_score) },
    { label: "Academic Self-Advocacy", score: Number(p.support_seeking_score) },
  ] : [];

  const tri = p ? Number(p.tri_score) : 0;
  const name = selected ? `${selected.first_name} ${selected.last_name}` : "";

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <DemoBanner token={token} />
      <DemoTimer expiresAt={expiresAt} onExpire={() => setExpired(true)} />

      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 pt-6" style={{ minHeight: "calc(100vh - 48px)" }}>
        {/* Candidate list */}
        <div className="w-[280px] shrink-0 rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-4" style={{ height: "fit-content" }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">Demo Candidates</p>
          {candidates.map((c) => {
            const cp = Array.isArray(c.insight_profiles) ? c.insight_profiles[0] : null;
            const t = cp ? Number(cp.tri_score) : 0;
            const tc = t >= 80 ? "#10b981" : t >= 60 ? "#6366f1" : "#f59e0b";
            const isSel = selected?.id === c.id;
            return (
              <div key={c.id} onClick={() => { setSelected(c); setTab("overview"); }} className="mb-1.5 cursor-pointer rounded-lg px-3.5 py-3 transition-all" style={{ background: isSel ? "rgba(99,102,241,0.15)" : "transparent", border: `1px solid ${isSel ? "rgba(99,102,241,0.4)" : "transparent"}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/90">{c.first_name} {c.last_name}</span>
                  <span className="font-mono text-sm font-bold" style={{ color: tc }}>{t}</span>
                </div>
                <div className="mt-0.5 text-xs text-white/60">Grade {c.grade_band} · {t >= 80 ? "Thriving" : t >= 60 ? "Ready" : "Developing"}</div>
              </div>
            );
          })}
        </div>

        {/* Detail */}
        <div className="flex-1">
          {selected && (
            <>
              {/* Header */}
              <div className="mb-4 flex items-center justify-between rounded-xl border border-[#2d2d3d] bg-[#1a1a24] px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0a1419] to-primary font-[family-name:var(--font-display)] text-lg font-bold text-white">{selected.first_name[0]}{selected.last_name[0]}</div>
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white/90">{name}</h2>
                    <span className="text-xs text-white/60">Grade {selected.grade_band} · Session Complete</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-4xl font-bold text-white/90">{tri}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">TRI Score</div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-1">
                {(["overview", "intelligence", "signals", "reports"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all ${tab === t ? "bg-primary text-white" : "border border-[#2d2d3d] text-white/70"}`}>
                    {t === "intelligence" ? "Evaluator Intelligence" : t === "signals" ? "Learning Support" : t}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="rounded-xl border border-[#2d2d3d] bg-[#1a1a24] p-6">
                {tab === "overview" && (
                  <div>
                    <h3 className="mb-5 font-[family-name:var(--font-display)] text-lg font-bold text-white/90">Readiness Dimensions</h3>
                    <div className="space-y-3.5">
                      {DIMS.map((d) => (
                        <div key={d.label}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ background: getColor(d.score) }} />
                              <span className="text-sm text-white/70">{d.label}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${getColor(d.score)}20`, color: getColor(d.score) }}>{getLabel(d.score)}</span>
                              <span className="w-7 text-right font-mono text-sm font-bold text-white/90">{d.score}</span>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${d.score}%`, background: getColor(d.score) }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "intelligence" && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-2"><span className="text-lg text-amber-400">✦</span><h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-white/90">Pre-Interview Briefing</h3></div>
                    <p className="mb-5 text-xs font-semibold text-primary">Generated for {name}</p>
                    {(tri >= 80 ? [
                      `${selected.first_name} demonstrated consistently strong engagement across reading passages — evidence use was purposeful.`,
                      `Written responses showed clear structure and intentional revision.`,
                      `No hint usage across reasoning tasks — worked through challenges independently.`,
                    ] : tri >= 65 ? [
                      `${selected.first_name} showed solid reading comprehension but revisited passages frequently.`,
                      `Reasoning performance (${p?.reasoning_score ?? "—"}) is notably higher than written expression (${p?.writing_score ?? "—"}) — ideas are there, expression developing.`,
                      `Hint usage was moderate — engaged with support tools when challenged.`,
                    ] : [
                      `${selected.first_name}'s session showed variable engagement — stronger on reasoning, weaker on sustained reading.`,
                      `Reflection responses were brief — metacognitive development may benefit from explicit instruction.`,
                      `Low hint usage despite errors may indicate difficulty recognizing when to seek support.`,
                    ]).map((obs, i) => (
                      <div key={i} className="mb-3 flex gap-3"><div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><p className="text-sm leading-relaxed text-white/70">{obs}</p></div>
                    ))}
                    <div className="mt-5 border-t border-white/5 pt-5">
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/60">Suggested Interview Questions</p>
                      {[`"Walk me through how you approached the hardest task."`, `"What would you do differently if you could redo one task?"`].map((q, i) => (
                        <div key={i} className="mb-2 rounded-lg border border-primary/15 bg-primary/5 px-3.5 py-2.5 text-sm italic leading-relaxed text-[#5eead4]">{q}</div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-300/80">
                      🔒 Post-interview synthesis generates after the evaluator rubric. Start your free trial to access the full rubric.
                    </div>
                  </div>
                )}

                {tab === "signals" && (
                  enriched.length === 0 ? (
                    <div className="py-8 text-center">
                      <div className="mb-3 text-3xl">✓</div>
                      <p className="text-base font-bold text-[#10b981]">No signals detected</p>
                      <p className="mx-auto mt-2 max-w-[400px] text-sm text-white/60">No notable behavioral patterns were identified during this session.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-5 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-xs text-orange-200/70" style={{ borderLeft: "3px solid #f97316" }}>
                        These are behavioral observations — not diagnoses. They indicate patterns that may warrant a professional learning support conversation.
                      </div>
                      {enriched.map((s) => (
                        <div key={s.id} className="mb-3 rounded-xl border border-[#2d2d3d] bg-white/[0.02] p-4">
                          <div className="mb-2 flex items-center gap-2.5">
                            <div className="h-2 w-2 rounded-full" style={{ background: s.severity === "notable" ? "#f97316" : "#f59e0b" }} />
                            <span className="text-sm font-bold text-white/90">{s.label}</span>
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: s.severity === "notable" ? "rgba(249,115,22,0.15)" : "rgba(245,158,11,0.15)", color: s.severity === "notable" ? "#f97316" : "#f59e0b" }}>{s.severity}</span>
                          </div>
                          <p className="mb-2 text-xs leading-relaxed text-white/70">{s.description}</p>
                          <p className="text-xs text-[#5eead4]">💡 {s.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {tab === "reports" && (
                  <div>
                    <h3 className="mb-5 font-[family-name:var(--font-display)] text-lg font-bold text-white/90">Available Reports</h3>
                    <div className="mb-6 flex gap-3">
                      {[{ label: "Internal Report", color: "#6366f1", desc: "Full evaluator report" }, { label: "Family Report", color: "#10b981", desc: "Parent-facing summary" }, { label: "Placement", color: "#8b5cf6", desc: "Placement recommendation" }].map((r) => (
                        <div key={r.label} className="flex-1 rounded-xl border p-4 text-center" style={{ borderColor: `${r.color}40`, background: `${r.color}10` }}>
                          <div className="mb-1.5 text-sm font-bold" style={{ color: r.color }}>{r.label}</div>
                          <div className="text-xs text-white/60">{r.desc}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                      <p className="text-sm leading-relaxed text-[#5eead4]">🔒 Report generation is available on your free trial. Start your trial to download all three report types for {name}.</p>
                      <a href={`/register?demo_token=${token}`} className="mt-3 inline-block rounded-lg bg-gradient-to-r from-primary to-[#8b5cf6] px-6 py-2.5 text-sm font-bold text-white">Start Free Trial — No Credit Card →</a>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showUpgrade && !expired && <DemoUpgradeModal onDismiss={() => setShowUpgrade(false)} token={token} />}
      {expired && <DemoExpiredModal token={token} />}
    </div>
  );
}
