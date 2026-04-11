export interface CandidatePayload {
  lift_candidate_id: string;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  grade: string | null;
  preferred_language: string | null;
  gender: string | null;
  lift_session_completed_at: string | null;
  tri_score: number | null;
  tri_label: string | null;
  readiness_dimensions: Record<string, number> | null;
  support_indicator_level: string | null;
  lift_report_url: string | null;
}

export interface SISAdapter {
  testConnection(): Promise<{ success: boolean; error?: string }>;
  pushCandidate(payload: CandidatePayload): Promise<{ external_id: string }>;
}

export type ProviderType = "veracross" | "blackbaud" | "powerschool" | "webhook" | "csv_manual";
