"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Soft nudge encouraging schools to fill in their mission_statement, which
// defensible decision language references when set. Dismissible, but
// auto-re-nudges every 14 days — a field this important shouldn't be
// dismissed forever.
//
// Rendered only when tenant_settings.mission_statement IS NULL/empty.
// Visibility and the 14-day re-nudge are tracked in localStorage; the
// mission_statement itself is the signal of truth.

const STORAGE_KEY = "lift.mission_statement.dismissedAt";
const RE_NUDGE_DAYS = 14;

interface Props {
  missionStatement: string | null;
}

export function MissionStatementBanner({ missionStatement }: Props) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (missionStatement && missionStatement.trim().length > 0) {
      setVisible(false);
      return;
    }
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setVisible(true);
      return;
    }
    const ts = Number(raw);
    if (!ts || Number.isNaN(ts)) {
      setVisible(true);
      return;
    }
    const ageMs = Date.now() - ts;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    setVisible(ageDays >= RE_NUDGE_DAYS);
  }, [missionStatement]);

  if (!visible) return null;

  function handleDismiss() {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary">{t("mission_banner.title")}</p>
        <p className="mt-1 text-xs text-muted">
          {t("mission_banner.body")}{" "}
          <Link href="/school/settings" className="font-medium text-primary hover:underline">
            {t("mission_banner.cta")}
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        aria-label={t("mission_banner.dismiss")}
        className="text-xs text-muted hover:text-lift-text"
      >
        {t("mission_banner.dismiss")}
      </button>
    </div>
  );
}
