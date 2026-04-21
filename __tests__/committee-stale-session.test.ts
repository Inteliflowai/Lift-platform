import { describe, it, expect } from "vitest";
import {
  isSessionOrphaned,
  shouldWarnAboutOrphan,
} from "@/lib/committee/staleSessionCheck";

const NOW = new Date("2026-04-21T12:00:00Z");

function daysAgo(d: number): Date {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000);
}

describe("isSessionOrphaned", () => {
  it("flags active + staged + >14d old as orphaned", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(15),
        stagedVoteCount: 3,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("does not flag active + staged + <14d old", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(10),
        stagedVoteCount: 3,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not flag concluded sessions regardless of age", () => {
    expect(
      isSessionOrphaned({
        status: "concluded",
        startedAt: daysAgo(60),
        stagedVoteCount: 5,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not flag archived sessions regardless of age", () => {
    expect(
      isSessionOrphaned({
        status: "archived",
        startedAt: daysAgo(60),
        stagedVoteCount: 5,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not flag empty sessions (no staged votes)", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(30),
        stagedVoteCount: 0,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("respects custom threshold", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(5),
        stagedVoteCount: 2,
        thresholdDays: 3,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("accepts string ISO dates", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(20).toISOString(),
        stagedVoteCount: 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("boundary — exactly at threshold is not orphaned", () => {
    expect(
      isSessionOrphaned({
        status: "active",
        startedAt: daysAgo(14),
        stagedVoteCount: 1,
        now: NOW,
      }),
    ).toBe(false);
  });
});

describe("shouldWarnAboutOrphan", () => {
  it("returns false when not orphaned", () => {
    expect(
      shouldWarnAboutOrphan({
        isOrphaned: false,
        lastWarnedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns true when orphaned and never warned", () => {
    expect(
      shouldWarnAboutOrphan({
        isOrphaned: true,
        lastWarnedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("returns false when warned within cooldown (default 7d)", () => {
    expect(
      shouldWarnAboutOrphan({
        isOrphaned: true,
        lastWarnedAt: daysAgo(3),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("returns true when warned before cooldown expired", () => {
    expect(
      shouldWarnAboutOrphan({
        isOrphaned: true,
        lastWarnedAt: daysAgo(10),
        now: NOW,
      }),
    ).toBe(true);
  });

  it("respects custom cooldown", () => {
    expect(
      shouldWarnAboutOrphan({
        isOrphaned: true,
        lastWarnedAt: daysAgo(2),
        reWarnCooldownDays: 1,
        now: NOW,
      }),
    ).toBe(true);
  });
});
