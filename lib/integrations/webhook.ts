import { createHmac } from "crypto";
import type { SISAdapter, CandidatePayload } from "./base";

interface WebhookConfig {
  url: string;
  secret: string;
  headers?: Record<string, string>;
}

export class WebhookAdapter implements SISAdapter {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testPayload = JSON.stringify({ event: "test", timestamp: new Date().toISOString() });
      const signature = createHmac("sha256", this.config.secret)
        .update(testPayload)
        .digest("hex");

      const res = await fetch(this.config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LIFT-Signature": signature,
          "X-LIFT-Event": "test",
          ...(this.config.headers ?? {}),
        },
        body: testPayload,
      });

      // Accept 200-299 or 404 (endpoint might not handle test events)
      if (res.ok || res.status === 404) return { success: true };
      return { success: false, error: `Webhook returned ${res.status}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCandidate(payload: CandidatePayload): Promise<{ external_id: string }> {
    const body = JSON.stringify({
      event: "candidate.admitted",
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = createHmac("sha256", this.config.secret)
      .update(body)
      .digest("hex");

    const res = await fetch(this.config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LIFT-Signature": signature,
        "X-LIFT-Event": "candidate.admitted",
        ...(this.config.headers ?? {}),
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Webhook push failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json().catch(() => ({}));
    return { external_id: data.external_id ?? data.id ?? payload.lift_candidate_id };
  }
}
