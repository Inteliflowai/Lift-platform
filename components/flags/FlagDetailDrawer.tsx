"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { FlagBadge } from "./FlagBadge";
import type { CandidateFlag } from "@/lib/flags/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface Props {
  candidateName: string;
  activeFlags: CandidateFlag[];
  canResolve: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export function FlagDetailDrawer({
  candidateName,
  activeFlags,
  canResolve,
  onClose,
  onResolved,
}: Props) {
  const { toast } = useToast();
  const { t } = useLocale();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveReason, setResolveReason] = useState("");
  const [snoozeDays, setSnoozeDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  async function submitResolve(flagId: string) {
    if (!resolveReason.trim()) {
      toast(t("flags.resolve.reason_required"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/school/flags/${flagId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved_reason: resolveReason.trim(), snooze_days: snoozeDays }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? t("flags.resolve.failure"), "error");
        return;
      }
      toast(t("flags.resolve.success"), "success");
      setResolvingId(null);
      setResolveReason("");
      onResolved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50">
      <div className="flex w-full max-w-md flex-col bg-surface shadow-2xl">
        <div className="flex items-start justify-between border-b border-lift-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{t("flags.drawer.title_prefix")} · {candidateName}</h2>
            <p className="mt-1 text-xs text-muted">
              {t("flags.drawer.subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="text-muted hover:text-lift-text"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {activeFlags.length === 0 ? (
            <p className="text-sm text-muted">{t("flags.no_active")}</p>
          ) : (
            activeFlags.map((f) => (
              <div key={f.id}>
                <FlagBadge
                  flag={f}
                  readOnly={!canResolve}
                  onResolve={canResolve ? () => setResolvingId(f.id) : undefined}
                />
                {resolvingId === f.id && (
                  <div className="mt-2 space-y-2 rounded-md border border-primary/40 bg-primary/5 p-3">
                    <label className="block text-[11px] font-medium text-muted">
                      {t("flags.resolve.reason_label")}
                      <textarea
                        value={resolveReason}
                        onChange={(e) => setResolveReason(e.target.value)}
                        rows={2}
                        className="mt-1 w-full rounded border border-lift-border bg-surface px-2 py-1.5 text-xs text-lift-text"
                        placeholder={t("flags.resolve.reason_placeholder")}
                      />
                    </label>
                    <label className="block text-[11px] font-medium text-muted">
                      {t("flags.resolve.snooze_label").replace("{days}", String(snoozeDays))}
                      <input
                        type="range"
                        min={1}
                        max={90}
                        value={snoozeDays}
                        onChange={(e) => setSnoozeDays(Number(e.target.value))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitResolve(f.id)}
                        disabled={submitting || !resolveReason.trim()}
                        className="flex-1 min-h-[36px] rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                      >
                        {submitting ? t("flags.action.resolving") : t("flags.action.resolve")}
                      </button>
                      <button
                        onClick={() => {
                          setResolvingId(null);
                          setResolveReason("");
                        }}
                        disabled={submitting}
                        className="flex-1 min-h-[36px] rounded border border-lift-border bg-surface px-3 py-1.5 text-xs text-muted"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
