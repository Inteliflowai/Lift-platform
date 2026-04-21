import { describe, it, expect } from "vitest";
import { classifyStaleness } from "@/lib/director/staleLanguagePredicate";

describe("classifyStaleness", () => {
  const NOW = new Date("2026-04-21T12:00:00Z").toISOString();
  const EARLIER = new Date("2026-04-15T12:00:00Z").toISOString();
  const LATER = new Date("2026-04-25T12:00:00Z").toISOString();

  it("returns missing_cache when no cache exists yet", () => {
    expect(
      classifyStaleness({
        hasCache: false,
        languageUpdatedAt: null,
        missionUpdatedAt: null,
      }),
    ).toBe("missing_cache");
  });

  it("returns missing_cache even when mission is set — language hasn't been generated", () => {
    expect(
      classifyStaleness({
        hasCache: false,
        languageUpdatedAt: null,
        missionUpdatedAt: NOW,
      }),
    ).toBe("missing_cache");
  });

  it("returns older_than_mission when cache predates mission update", () => {
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: EARLIER,
        missionUpdatedAt: NOW,
      }),
    ).toBe("older_than_mission");
  });

  it("returns null when cache is newer than mission update", () => {
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: LATER,
        missionUpdatedAt: NOW,
      }),
    ).toBeNull();
  });

  it("returns null when tenant has no mission timestamp — don't nag schools who haven't engaged", () => {
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: NOW,
        missionUpdatedAt: null,
      }),
    ).toBeNull();
  });

  it("returns null when cache is exactly equal to mission timestamp (boundary)", () => {
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: NOW,
        missionUpdatedAt: NOW,
      }),
    ).toBeNull();
  });

  it("handles cache-exists-but-updated-at-null edge case gracefully", () => {
    // If cache somehow exists but no timestamp, we can't compare — don't mark stale
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: null,
        missionUpdatedAt: NOW,
      }),
    ).toBeNull();
  });

  it("classifies a fresh-pipeline-output candidate as not stale even right after mission change", () => {
    // Admin updates mission at T. Pipeline runs at T+1 min, regenerates language at T+1 min.
    // Staleness check at T+2 min: language is newer than mission → not stale.
    const t = new Date("2026-04-21T12:00:00Z").toISOString();
    const tPlusOneMin = new Date("2026-04-21T12:01:00Z").toISOString();
    expect(
      classifyStaleness({
        hasCache: true,
        languageUpdatedAt: tPlusOneMin,
        missionUpdatedAt: t,
      }),
    ).toBeNull();
  });
});
