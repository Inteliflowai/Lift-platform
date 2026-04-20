import { ApiTestClient } from "./ApiTestClient";

export const dynamic = "force-dynamic";

export default function ApiTestPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API &amp; Tag Diagnostics</h1>
        <p className="mt-1 text-xs text-muted">
          Platform-admin-only probes for external APIs and analytics pixels. Runs live checks —
          Anthropic costs ~$0.00003 per run (1-token ping); all other probes are read-only and free.
        </p>
      </div>
      <ApiTestClient />
    </div>
  );
}
