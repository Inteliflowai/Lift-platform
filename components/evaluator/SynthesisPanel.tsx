"use client";

type Synthesis = {
  confirmations: string[];
  contradictions: string[];
  new_signals: string[];
  synthesis_narrative: string;
  updated_support_recommendation: string;
};

export function SynthesisPanel({
  synthesis,
  originalPlacement,
}: {
  synthesis: Synthesis | null;
  originalPlacement?: string | null;
}) {
  if (!synthesis) {
    return (
      <div className="rounded-lg border border-[#e5e5e5] bg-[#f8f8fa] p-5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
          <p className="text-sm text-muted">Synthesizing interview observations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold">Post-Interview Synthesis</h3>

      {/* Confirmations */}
      {synthesis.confirmations.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {synthesis.confirmations.map((c, i) => (
            <span key={i} className="rounded-full bg-[#10b981]/10 px-3 py-1 text-xs text-[#10b981]">{c}</span>
          ))}
        </div>
      )}

      {/* Contradictions */}
      {synthesis.contradictions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {synthesis.contradictions.map((c, i) => (
            <span key={i} className="rounded-full bg-[#f59e0b]/10 px-3 py-1 text-xs text-[#f59e0b]">{c}</span>
          ))}
        </div>
      )}

      {/* New Signals */}
      {synthesis.new_signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {synthesis.new_signals.map((s, i) => (
            <span key={i} className="rounded-full bg-[#6366f1]/10 px-3 py-1 text-xs text-[#6366f1]">{s}</span>
          ))}
        </div>
      )}

      {/* Narrative */}
      {synthesis.synthesis_narrative && (
        <p className="text-sm text-muted leading-relaxed">{synthesis.synthesis_narrative}</p>
      )}

      {/* Updated Placement */}
      {synthesis.updated_support_recommendation && synthesis.updated_support_recommendation !== originalPlacement && (
        <div className="rounded-md border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-medium text-[#f59e0b]">Revised based on interview</span>
          </div>
          <p className="text-sm">{synthesis.updated_support_recommendation}</p>
          {originalPlacement && (
            <p className="text-xs text-muted">Original: {originalPlacement.slice(0, 200)}</p>
          )}
        </div>
      )}
    </div>
  );
}
