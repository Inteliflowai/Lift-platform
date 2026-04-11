import type { SISAdapter, CandidatePayload } from "./base";

interface PowerSchoolConfig {
  server_url: string;
  client_id: string;
  client_secret: string;
}

export class PowerSchoolAdapter implements SISAdapter {
  private config: PowerSchoolConfig;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: PowerSchoolConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return this.config.server_url.replace(/\/$/, "");
  }

  private async getAccessToken(): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    const credentials = Buffer.from(
      `${this.config.client_id}:${this.config.client_secret}`
    ).toString("base64");

    const res = await fetch(`${this.baseUrl}/oauth/access_token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(`PowerSchool OAuth failed: ${res.status} ${await res.text()}`);
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
      const res = await fetch(`${this.baseUrl}/ws/v1/district`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) return { success: false, error: `API returned ${res.status}` };
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async pushCandidate(payload: CandidatePayload): Promise<{ external_id: string }> {
    const token = await this.getAccessToken();

    const body = {
      students: {
        student: {
          name: {
            first_name: payload.first_name,
            last_name: payload.last_name,
          },
          contact_info: {
            email: payload.email,
          },
          demographics: {
            gender: payload.gender,
          },
          school_enrollment: {
            grade_level: payload.grade,
          },
        },
      },
    };

    const res = await fetch(`${this.baseUrl}/ws/v1/student`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`PowerSchool push failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return { external_id: data.id?.toString() ?? data.student?.id?.toString() ?? "" };
  }
}
