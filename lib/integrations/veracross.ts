import type { SISAdapter, CandidatePayload } from "./base";

interface VeracrossConfig {
  client_id: string;
  client_secret: string;
  school_route: string;
}

export class VeracrossAdapter implements SISAdapter {
  private config: VeracrossConfig;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: VeracrossConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const res = await fetch("https://accounts.veracross.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        scope: "veracross:admissions:write",
      }),
    });

    if (!res.ok) {
      throw new Error(`Veracross OAuth failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    this.tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };
    return data.access_token;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(
        `https://api.veracross.com/${this.config.school_route}/v3/applicants?page=1&page_size=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return { success: false, error: `API returned ${res.status}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCandidate(payload: CandidatePayload): Promise<{ external_id: string }> {
    const token = await this.getAccessToken();

    const body = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      applying_for_grade: payload.grade,
      email: payload.email,
      language_preference: payload.preferred_language,
      gender: payload.gender,
      custom_fields: {
        lift_candidate_id: payload.lift_candidate_id,
        tri_score: payload.tri_score,
        support_level: payload.support_indicator_level,
      },
    };

    const res = await fetch(
      `https://api.veracross.com/${this.config.school_route}/v3/applicants`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      throw new Error(`Veracross push failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { external_id: data.data?.id?.toString() ?? data.id?.toString() ?? "" };
  }
}
