import type { SISAdapter, CandidatePayload } from "./base";

interface BlackbaudConfig {
  subscription_key: string;
  access_token: string;
  refresh_token: string;
  school_id: string;
}

export class BlackbaudAdapter implements SISAdapter {
  private config: BlackbaudConfig;
  private currentToken: string;

  constructor(config: BlackbaudConfig) {
    this.config = config;
    this.currentToken = config.access_token;
  }

  private async refreshToken(): Promise<void> {
    const res = await fetch("https://oauth2.sky.blackbaud.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refresh_token,
      }),
    });

    if (!res.ok) {
      throw new Error(`Blackbaud token refresh failed: ${res.status}`);
    }

    const data = await res.json();
    this.currentToken = data.access_token;
    this.config.refresh_token = data.refresh_token;
  }

  private async apiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.currentToken}`,
      "Bb-Api-Subscription-Key": this.config.subscription_key,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    let res = await fetch(url, { ...options, headers });

    // Auto-refresh on 401
    if (res.status === 401) {
      await this.refreshToken();
      headers["Authorization"] = `Bearer ${this.currentToken}`;
      res = await fetch(url, { ...options, headers });
    }

    return res;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await this.apiCall(
        `https://api.sky.blackbaud.com/school/v1/schools/${this.config.school_id}`
      );
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
      entering_grade: payload.grade,
      gender: payload.gender,
      custom_fields: {
        lift_candidate_id: payload.lift_candidate_id,
        tri_score: payload.tri_score,
        support_level: payload.support_indicator_level,
      },
    };

    const res = await this.apiCall(
      "https://api.sky.blackbaud.com/admissions/v1/candidates",
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      throw new Error(`Blackbaud push failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { external_id: data.id?.toString() ?? "" };
  }
}
