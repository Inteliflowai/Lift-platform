"use client";

import { useState } from "react";

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
};

export function SettingsClient({
  settings: initial,
}: {
  settings: Settings | null;
}) {
  const [settings, setSettings] = useState<Settings | null>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!settings) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-2 text-muted">No settings found for this tenant.</p>
      </div>
    );
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);

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
      }),
    });

    if (res.ok) {
      const updated = await res.json();
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="space-y-5 rounded-lg border border-lift-border bg-surface p-5">
        {/* Default Language */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Default Language</p>
            <p className="text-xs text-muted">
              Language for invites and session UI
            </p>
          </div>
          <select
            value={settings.default_language}
            onChange={(e) =>
              setSettings({ ...settings, default_language: e.target.value })
            }
            className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          >
            <option value="en">English</option>
            <option value="pt">Portuguese</option>
          </select>
        </div>

        {/* COPPA Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">COPPA Mode</p>
            <p className="text-xs text-muted">
              Require guardian consent for all new invites
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
            <p className="text-sm font-medium">Session Pause</p>
            <p className="text-xs text-muted">
              Allow candidates to pause and resume sessions
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
            <p className="text-sm text-muted">Max pause hours</p>
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
                  {h} hours
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Data Retention */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Data Retention</p>
            <p className="text-xs text-muted">
              How long candidate data is kept
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
            <option value={365}>1 year</option>
            <option value={1095}>3 years</option>
            <option value={2555}>7 years</option>
          </select>
        </div>

        {/* Human Review */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Require Human Review Always</p>
            <p className="text-xs text-muted">
              Flag every insight profile for manual review
            </p>
          </div>
          <Toggle
            checked={settings.require_human_review_always}
            onChange={(v) =>
              setSettings({ ...settings, require_human_review_always: v })
            }
          />
        </div>

        {/* Voice Response Mode */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Voice Response Mode</p>
            <p className="text-xs text-muted">
              Allow candidates to speak their responses instead of typing.
              Available on writing, reflection, and scenario tasks. Reading
              tasks always require typed responses.
            </p>
            <p className="mt-1 text-[10px] text-muted/70">
              Voice recordings are transcribed and immediately deleted. No
              audio is stored after transcription.
            </p>
          </div>
          <Toggle
            checked={settings.voice_mode_enabled}
            onChange={(v) =>
              setSettings({ ...settings, voice_mode_enabled: v })
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {saved && <span className="text-xs text-success">Settings saved</span>}
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
