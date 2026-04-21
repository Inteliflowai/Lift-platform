// Pure predicate for orphaned-session detection. Used by the nightly cron
// at /api/cron/committee-orphan-check and by unit tests.
//
// A session is "orphaned" when:
//   - status is 'active' (not yet concluded or archived)
//   - it has at least one staged vote (there's committed work inside it)
//   - it's older than thresholdDays (default 14)
//
// A session with no staged votes is just an empty open session — the host
// started a meeting, never voted, walked away. Not worth paging them.

export interface SessionOrphanCheck {
  status: "active" | "concluded" | "archived";
  startedAt: string | Date;
  stagedVoteCount: number;
  thresholdDays?: number;
  now?: Date;
}

export function isSessionOrphaned(input: SessionOrphanCheck): boolean {
  const { status, stagedVoteCount, thresholdDays = 14 } = input;
  if (status !== "active") return false;
  if (stagedVoteCount <= 0) return false;

  const started = input.startedAt instanceof Date
    ? input.startedAt
    : new Date(input.startedAt);
  const now = input.now ?? new Date();
  const ageMs = now.getTime() - started.getTime();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  return ageMs > thresholdMs;
}

// Whether to warn the host right now. Adds a 7-day re-warn cooldown so an
// unresolved orphan doesn't email the host nightly.
export function shouldWarnAboutOrphan(input: {
  isOrphaned: boolean;
  lastWarnedAt: string | Date | null;
  reWarnCooldownDays?: number;
  now?: Date;
}): boolean {
  if (!input.isOrphaned) return false;
  if (!input.lastWarnedAt) return true;
  const last = input.lastWarnedAt instanceof Date
    ? input.lastWarnedAt
    : new Date(input.lastWarnedAt);
  const now = input.now ?? new Date();
  const cooldownDays = input.reWarnCooldownDays ?? 7;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  return now.getTime() - last.getTime() > cooldownMs;
}
