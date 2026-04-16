/**
 * Maps internal TRI labels to user-friendly readiness terms.
 * Internal DB values: emerging, developing, ready, thriving
 * Display values: Emerging Readiness, Developing Readiness, Strong Readiness
 */

const TRI_DISPLAY_MAP: Record<string, string> = {
  emerging: "Emerging Readiness",
  developing: "Developing Readiness",
  ready: "Strong Readiness",
  thriving: "Strong Readiness",
};

export function displayTriLabel(dbLabel: string | null | undefined): string {
  if (!dbLabel) return "";
  return TRI_DISPLAY_MAP[dbLabel.toLowerCase()] ?? dbLabel;
}

/**
 * Maps a TRI score to a readiness label.
 */
export function triScoreToLabel(score: number): string {
  if (score >= 75) return "Strong Readiness";
  if (score >= 50) return "Developing Readiness";
  return "Emerging Readiness";
}
