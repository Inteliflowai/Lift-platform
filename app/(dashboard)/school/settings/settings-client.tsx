"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/ui/Toast";

type Settings = {
  id: string;
  tenant_id: string;
  default_language: string;
  coppa_mode: boolean;
  session_pause_allowed: boolean;
  session_pause_limit_hours: number;
  data_retention_days: number;
  require_human_review_always: boolean;
  voice_mode_enabled: boolean;
  passage_reader_enabled: boolean;
  delete_audio_after_transcription: boolean;
  auto_invite_on_import?: boolean;
  invite_deadline_days?: number;
};

export function SettingsClient({
  settings: initial,
  coreIntegration,
  isPlatformAdmin,
  tenantId,
}: {
  settings: Settings | null;
  coreIntegration: { enabled: boolean; coreTenantId: string } | null;
  isPlatformAdmin: boolean;
  tenantId: string;
}) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(initial);
  const [saving, setSaving] = useState(false);
  const [coreEnabled, setCoreEnabled] = useState(coreIntegration?.enabled ?? false);
  const [coreTenantId, setCoreTenantId] = useState(coreIntegration?.coreTenantId ?? "");
  const [coreSaving, setCoreSaving] = useState(false);
  const { toast } = useToast();

  if (!settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
        <p className="mt-2 text-muted">No settings found for this tenant.</p>
      </div>
    );
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    const res = await fetch("/api/school/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        default_language: settings.default_language,
        coppa_mode: settings.coppa_mode,
        session_pause_allowed: settings.session_pause_allowed,
        session_pause_limit_hours: settings.session_pause_limit_hours,
        data_retention_days: settings.data_retention_days,
        require_human_review_always: settings.require_human_review_always,
        voice_mode_enabled: settings.voice_mode_enabled,
        passage_reader_enabled: settings.passage_reader_enabled,
        auto_invite_on_import: settings.auto_invite_on_import,
        invite_deadline_days: settings.invite_deadline_days,
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      toast("Settings saved");
    } else {
      toast("Failed to save settings", "error");
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <div className="space-y-5 rounded-lg border border-lift-border bg-surface p-5">
        {/* Default Language */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("settings.language")}</p>
            <p className="text-xs text-muted">
              {t("settings.language_desc")}
            </p>
          </div>
          <select
            value={settings.default_language}
            onChange={(e) =>
              setSettings({ ...settings, default_language: e.target.value })
            }
            className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            <option value="en">{t("common.english") || "English"}</option>
            <option value="pt">{t("common.portuguese") || "Portuguese"}</option>
          </select>
        </div>

        {/* COPPA Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("settings.coppa")}</p>
            <p className="text-xs text-muted">
              {t("settings.coppa_desc")}
            </p>
          </div>
          <Toggle
            checked={settings.coppa_mode}
            onChange={(v) => setSettings({ ...settings, coppa_mode: v })}
          />
        </div>

        {/* Session Pause */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("settings.session_pause")}</p>
            <p className="text-xs text-muted">
              {t("settings.session_pause_desc")}
            </p>
          </div>
          <Toggle
            checked={settings.session_pause_allowed}
            onChange={(v) =>
              setSettings({ ...settings, session_pause_allowed: v })
            }
          />
        </div>

        {settings.session_pause_allowed && (
          <div className="flex items-center justify-between pl-4">
            <p className="text-sm text-muted">{t("settings.max_pause_hours")}</p>
            <select
              value={settings.session_pause_limit_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  session_pause_limit_hours: parseInt(e.target.value),
                })
              }
              className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
            >
              {[12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} {t("common.hours")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data Retention */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("settings.data_retention")}</p>
            <p className="text-xs text-muted">
              {t("settings.data_retention_desc")}
            </p>
          </div>
          <select
            value={settings.data_retention_days}
            onChange={(e) =>
              setSettings({
                ...settings,
                data_retention_days: parseInt(e.target.value),
              })
            }
            className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            <option value={365}>1 {t("common.year")}</option>
            <option value={1095}>3 {t("common.years")}</option>
            <option value={2555}>7 {t("common.years")}</option>
          </select>
        </div>

        {/* Human Review */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{t("settings.human_review")}</p>
            <p className="text-xs text-muted">
              {t("settings.human_review_desc")}
            </p>
          </div>
          <Toggle
            checked={settings.require_human_review_always}
            onChange={(v) =>
              setSettings({ ...settings, require_human_review_always: v })
            }
          />
        </div>

        {/* Voice & Accessibility */}
        <div className="border-t border-lift-border pt-4 mt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            {t("settings.voice_accessibility")}
          </p>

          {/* Voice Response */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.voice_response")}</p>
              <p className="text-xs text-muted">
                {t("settings.voice_response_desc")}
              </p>
            </div>
            <Toggle
              checked={settings.voice_mode_enabled}
              onChange={(v) =>
                setSettings({ ...settings, voice_mode_enabled: v })
              }
            />
          </div>

          {/* Passage Reader */}
          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-sm font-medium">{t("settings.passage_reader")}</p>
              <p className="text-xs text-muted">
                {t("settings.passage_reader_desc")}
              </p>
            </div>
            <Toggle
              checked={settings.passage_reader_enabled}
              onChange={(v) =>
                setSettings({ ...settings, passage_reader_enabled: v })
              }
            />
          </div>

          {/* Audio privacy note */}
          <p className="mt-3 text-[10px] text-muted/70">
            {t("settings.audio_privacy")}
          </p>
        </div>

        {/* Invitation Automation */}
        <div className="border-t border-lift-border pt-4 mt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
            Invitation Automation
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-send invitations on import</p>
              <p className="text-xs text-muted">
                Automatically email LIFT session links when candidates are imported or added via SIS webhook
              </p>
            </div>
            <Toggle
              checked={settings.auto_invite_on_import ?? false}
              onChange={(v) =>
                setSettings({ ...settings, auto_invite_on_import: v })
              }
            />
          </div>

          <div className="flex items-center justify-between mt-4">
            <div>
              <p className="text-sm font-medium">Invitation deadline</p>
              <p className="text-xs text-muted">
                Days before the session link expires
              </p>
            </div>
            <select
              value={settings.invite_deadline_days ?? 7}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  invite_deadline_days: parseInt(e.target.value),
                })
              }
              className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
            >
              {[3, 5, 7, 10, 14, 21, 30].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("common.loading") : t("settings.save")}
        </button>
      </div>

      {/* CORE Integration */}
      <div className="mt-8 space-y-4 rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="text-lg font-semibold">CORE Integration</h2>

        {isPlatformAdmin ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable CORE Integration</p>
                <p className="text-xs text-muted">
                  Automatically send admitted candidates to CORE for student
                  profile creation.
                </p>
              </div>
              <Toggle
                checked={coreEnabled}
                onChange={(v) => setCoreEnabled(v)}
              />
            </div>

            {coreEnabled && (
              <div>
                <label className="mb-1 block text-xs text-muted">
                  CORE School ID (UUID from CORE platform)
                </label>
                <input
                  type="text"
                  value={coreTenantId}
                  onChange={(e) => setCoreTenantId(e.target.value)}
                  placeholder="e.g. a1b2c3d4-e5f6-..."
                  className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
                />
              </div>
            )}

            <button
              onClick={async () => {
                setCoreSaving(true);
                await fetch(`/api/admin/tenants/${tenantId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    core_integration_enabled: coreEnabled,
                    core_tenant_id: coreTenantId || null,
                  }),
                });
                setCoreSaving(false);
              }}
              disabled={coreSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {coreSaving ? "Saving..." : "Save CORE Settings"}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {coreEnabled ? (
              <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                Connected to CORE
              </span>
            ) : (
              <span className="text-sm text-muted">
                CORE integration is not configured. Contact your platform
                administrator.
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-lift-border"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}
