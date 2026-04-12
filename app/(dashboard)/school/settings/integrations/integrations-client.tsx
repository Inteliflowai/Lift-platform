"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Check, X, Download, Upload, Plug, Unplug } from "lucide-react";

interface Integration {
  id: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
}

interface SyncLog {
  id: string;
  provider: string;
  candidate_id: string;
  direction: string;
  status: string;
  error_message: string | null;
  synced_at: string;
}

const PROVIDERS = [
  { id: "veracross", name: "Veracross", desc: "OAuth 2.0 client credentials", fields: ["client_id", "client_secret", "school_route"] },
  { id: "blackbaud", name: "Blackbaud", desc: "SKY API with token refresh", fields: ["subscription_key", "access_token", "refresh_token", "school_id"] },
  { id: "powerschool", name: "PowerSchool", desc: "REST API", fields: ["server_url", "client_id", "client_secret"] },
  { id: "ravenna", name: "Ravenna", desc: "Ravenna Solutions API", fields: ["api_key", "school_slug"] },
  { id: "webhook", name: "Webhook", desc: "Generic webhook with HMAC-SHA256", fields: ["url", "secret"] },
  { id: "csv_manual", name: "CSV Manual", desc: "Export/import CSV files", fields: [] },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  error: "bg-red-100 text-red-700",
};

export function IntegrationsClient() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [configModal, setConfigModal] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const res = await fetch("/api/school/integrations");
    const data = await res.json();
    setIntegrations(data.integrations ?? []);
    setLogs(data.logs ?? []);
    setLoading(false);
  }

  function getIntegration(provider: string): Integration | undefined {
    return integrations.find((i) => i.provider === provider);
  }

  async function saveConfig(provider: string) {
    setSaving(true);
    await fetch("/api/school/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, config: configForm }),
    });
    setSaving(false);
    setConfigModal(null);
    setConfigForm({});
    fetchData();
  }

  async function testConnection(integrationId: string) {
    setTesting(integrationId);
    setTestResult(null);
    const res = await fetch("/api/school/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: integrationId, action: "test" }),
    });
    const result = await res.json();
    setTestResult(result);
    setTesting(null);
    fetchData();
  }

  async function performAction(integrationId: string, action: string) {
    await fetch("/api/school/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: integrationId, action }),
    });
    fetchData();
  }

  async function retryFailed() {
    setRetrying(true);
    const integration = integrations[0];
    if (integration) {
      await fetch("/api/school/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: integration.id, action: "retry_failed" }),
      });
    }
    setRetrying(false);
    setTimeout(fetchData, 2000);
  }

  async function exportCSV(format: string) {
    window.open(`/api/integrations/csv?format=${format}`, "_blank");
  }

  if (loading) return <p className="py-8 text-center text-muted">Loading integrations...</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-lift-text">SIS Integrations</h1>
        <p className="mt-1 text-sm text-muted">
          Connect LIFT to your Student Information System to automatically push admitted candidates.
        </p>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROVIDERS.map((p) => {
          const integration = getIntegration(p.id);
          const isCSV = p.id === "csv_manual";

          return (
            <div key={p.id} className="rounded-lg border border-lift-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-lift-text">{p.name}</h3>
                {integration ? (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[integration.status] ?? "bg-gray-100"}`}>
                    {integration.status}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted">{p.desc}</p>

              {integration?.last_sync_at && (
                <p className="mt-2 text-[10px] text-muted">
                  Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                  {integration.last_sync_status === "failed" && (
                    <span className="ml-1 text-red-500">Failed</span>
                  )}
                </p>
              )}

              <div className="mt-3 flex gap-2 flex-wrap">
                {isCSV ? (
                  <>
                    <button
                      onClick={() => exportCSV("standard")}
                      className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                    >
                      <Download size={12} /> Export
                    </button>
                    <button
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".csv";
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          const form = new FormData();
                          form.append("file", file);
                          await fetch("/api/integrations/csv", { method: "POST", body: form });
                          fetchData();
                        };
                        input.click();
                      }}
                      className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-muted hover:bg-gray-200"
                    >
                      <Upload size={12} /> Import
                    </button>
                  </>
                ) : integration ? (
                  <>
                    <button
                      onClick={() => testConnection(integration.id)}
                      disabled={testing === integration.id}
                      className="flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                    >
                      {testing === integration.id ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                      Test
                    </button>
                    {integration.status === "active" ? (
                      <button
                        onClick={() => performAction(integration.id, "deactivate")}
                        className="flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-muted hover:bg-gray-200"
                      >
                        <Unplug size={12} /> Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => performAction(integration.id, "activate")}
                        className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        <Plug size={12} /> Enable
                      </button>
                    )}
                    <button
                      onClick={() => performAction(integration.id, "disconnect")}
                      className="flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      <X size={12} /> Remove
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setConfigModal(p.id); setConfigForm({}); }}
                    className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
                  >
                    <Plug size={12} /> Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${testResult.success ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {testResult.success ? "Connection successful!" : `Connection failed: ${testResult.error}`}
          <button onClick={() => setTestResult(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* CSV Format Export */}
      <div className="rounded-lg border border-lift-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-lift-text mb-3">CSV Export Formats</h3>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV("standard")} className="rounded-md border border-lift-border px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-gray-50">
            Standard CSV
          </button>
          <button onClick={() => exportCSV("veracross")} className="rounded-md border border-lift-border px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-gray-50">
            Veracross Format
          </button>
          <button onClick={() => exportCSV("blackbaud")} className="rounded-md border border-lift-border px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-gray-50">
            Blackbaud Format
          </button>
        </div>
      </div>

      {/* Sync Log */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-lift-border">
          <div className="flex items-center justify-between border-b border-lift-border px-4 py-3">
            <h3 className="text-sm font-semibold text-lift-text">Recent Sync Log</h3>
            <button
              onClick={retryFailed}
              disabled={retrying}
              className="flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw size={12} className={retrying ? "animate-spin" : ""} /> Retry Failed
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left text-muted uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2">Direction</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lift-border">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(log.synced_at).toLocaleString()}</td>
                    <td className="px-4 py-2 capitalize">{log.provider}</td>
                    <td className="px-4 py-2 capitalize">{log.direction}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        log.status === "success" ? "bg-green-100 text-green-700" : log.status === "failed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-[200px] truncate text-red-600">{log.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-lift-text capitalize">
              Connect {PROVIDERS.find((p) => p.id === configModal)?.name}
            </h3>
            <p className="mt-1 text-sm text-muted">Enter your credentials. They will be encrypted before storage.</p>
            <div className="mt-4 space-y-3">
              {PROVIDERS.find((p) => p.id === configModal)?.fields.map((field) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-medium text-muted capitalize">
                    {field.replace(/_/g, " ")}
                  </label>
                  <input
                    type={field.includes("secret") || field.includes("token") || field.includes("key") ? "password" : "text"}
                    value={configForm[field] ?? ""}
                    onChange={(e) => setConfigForm((f) => ({ ...f, [field]: e.target.value }))}
                    className="w-full rounded-lg border border-lift-border px-3 py-2 text-sm"
                    placeholder={field}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setConfigModal(null); setConfigForm({}); }}
                className="rounded-lg border border-lift-border px-4 py-2 text-sm text-muted hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => saveConfig(configModal)}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save & Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
