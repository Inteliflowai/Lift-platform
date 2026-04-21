// Pure predicate for defensible-language staleness. No DB dependencies —
// safe to import from unit tests without env vars.

export type StalenessReason = "older_than_mission" | "missing_cache";

export function classifyStaleness({
  hasCache,
  languageUpdatedAt,
  missionUpdatedAt,
}: {
  hasCache: boolean;
  languageUpdatedAt: string | null;
  missionUpdatedAt: string | null;
}): StalenessReason | null {
  if (!hasCache) return "missing_cache";
  if (
    missionUpdatedAt &&
    languageUpdatedAt &&
    new Date(languageUpdatedAt) < new Date(missionUpdatedAt)
  ) {
    return "older_than_mission";
  }
  return null;
}
