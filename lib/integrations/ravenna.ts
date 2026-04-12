import type { SISAdapter, CandidatePayload } from "./base";

interface RavennaConfig {
  api_key: string;
  school_slug: string;
}

export class RavennaAdapter implements SISAdapter {
  private config: RavennaConfig;

  constructor(config: RavennaConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `https://api.ravenna-hub.com/v1/schools/${this.config.school_slug}`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.api_key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/applicants?limit=1`, {
        headers: this.headers,
      });
      if (!res.ok) return { success: false, error: `API returned ${res.status}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCandidate(payload: CandidatePayload): Promise<{ external_id: string }> {
    const body = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      applying_grade: payload.grade,
      gender: payload.gender,
      preferred_language: payload.preferred_language,
      custom_fields: {
        lift_candidate_id: payload.lift_candidate_id,
        lift_tri_score: payload.tri_score,
        lift_tri_label: payload.tri_label,
        lift_support_level: payload.support_indicator_level,
        lift_session_completed: payload.lift_session_completed_at,
      },
    };

    const res = await fetch(`${this.baseUrl}/applicants`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Ravenna push failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { external_id: data.id?.toString() ?? "" };
  }
}
