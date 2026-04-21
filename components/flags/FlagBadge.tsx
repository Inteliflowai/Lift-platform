"use client";

import type { CandidateFlag } from "@/lib/flags/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Per-flag card: severity badge, observational description, evidence block.
// Used inside the FlagDetailDrawer and inline on candidate-detail + committee
// deliberation surfaces. Strict observation-vocabulary discipline.

interface Props {
  flag: CandidateFlag;
  onResolve?: (flagId: string) => void;
  readOnly?: boolean;
}

export function FlagBadge({ flag, onResolve, readOnly = false }: Props) {
  const { t } = useLocale();
  const toneClass =
    flag.severity === "notable"
      ? "border-rose-500/40 bg-rose-500/5"
      : "border-amber-500/40 bg-amber-500/5";
  const pillClass =
    flag.severity === "notable"
      ? "bg-rose-500/15 text-rose-400"
      : "bg-amber-500/15 text-amber-400";
  const label = t(`flags.label.${flag.flag_type}`);
  const description = t(`flags.desc.${flag.flag_type}`);
  const severityLabel = t(`flags.severity.${flag.severity}`);
  const detectedDate = new Date(flag.detected_at).toLocaleDateString();

  return (
    <div className={`rounded-md border-2 ${toneClass} p-3 text-xs`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${pillClass}`}>
              {severityLabel}
            </span>
            <span className="font-medium text-lift-text">{label}</span>
          </div>
          <p className="mt-1.5 leading-relaxed text-muted">{description}</p>
          <p className="mt-1 text-[10px] text-muted">{t("flags.detected_prefix")} {detectedDate}</p>
        </div>
        {!readOnly && onResolve && (
          <button
            onClick={() => onResolve(flag.id)}
            className="shrink-0 rounded border border-lift-border bg-surface px-2 py-1 text-[10px] font-medium text-muted hover:border-primary/50 hover:text-primary"
          >
            {t("flags.action.resolve")}
          </button>
        )}
      </div>
      {flag.computed_from && Object.keys(flag.computed_from).length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wide text-muted">
            {t("flags.evidence.summary")}
          </summary>
          <pre className="mt-1 overflow-x-auto rounded bg-page-bg/50 p-2 text-[10px] text-muted">
            {JSON.stringify(flag.computed_from, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
