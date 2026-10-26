import { describe, expect, it } from "vitest";
import { buildPersonalBestAchievements, convertWeight } from "@/lib/fitness";
import { achievementNotificationKey, unreadAchievementKeys } from "@/lib/achievement-notifications";
import type { WorkoutSession } from "@/lib/types";

function session(id: string, day: number, reps: number[], weight = 50): WorkoutSession {
  const date = `2026-10-${day}T12:00:00Z`;
  return { id, title: "Squat", status: "completed", performedAt: date, createdAt: date, updatedAt: date, exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", sets: reps.map((repetitions, index) => ({ id: `set-${index}`, setNumber: index + 1, weight, repetitions, completed: true, type: "working" })) }] };
}

describe("rep and set achievements", () => {
  it("recognizes more total reps without needing heavier weight or more sets", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [10, 10]), session("next", 11, [12, 12])]);
    expect(achievements).toHaveLength(2);
    expect(achievements[0]).toMatchObject({ kind: "reps", previousCount: 20, currentCount: 24, improvement: 4 });
  });
  it("recognizes more sets independently even if total reps and weight decrease", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [20], 60), session("next", 11, [5, 5], 50)]);
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({ kind: "sets", previousCount: 1, currentCount: 2, improvement: 1 });
  });
  it("recognizes all four improvements and compares counts to the last log, not all-time records", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [10]), session("next", 11, [12, 12], 55)]);
    expect(achievements.map((item) => item.kind).sort()).toEqual(["reps", "sets", "volume", "weight"]);
    const rebound = buildPersonalBestAchievements([session("best", 10, [20, 20, 20]), session("lower", 11, [10]), session("rebound", 12, [12, 12])]);
    expect(rebound.filter((item) => item.id.startsWith("rebound:"))).toHaveLength(3);
  });
  it("excludes drafts, warmups and incomplete sets and handles bodyweight exercises", () => {
    const baseline = session("first", 10, [10], 0);
    const draft = { ...session("draft", 11, [100, 100], 0), status: "draft" as const };
    const next = session("next", 12, [12, 12, 100, 100], 0);
    next.exercises[0].sets[2].type = "warmup";
    next.exercises[0].sets[3].completed = false;
    expect(buildPersonalBestAchievements([baseline, draft, next]).map((item) => item.kind)).toEqual(["reps", "sets"]);
    expect(buildPersonalBestAchievements([baseline])).toHaveLength(0);
    expect(buildPersonalBestAchievements([baseline, session("same", 11, [10], 0)])).toHaveLength(0);
  });
  it("merges duplicate exercise blocks into one comparable log", () => {
    const first = session("first", 10, [10]);
    first.exercises.push({ ...first.exercises[0], id: "duplicate", name: " BARBELL   BACK SQUAT " });
    expect(buildPersonalBestAchievements([first])).toHaveLength(0);
    expect(buildPersonalBestAchievements([first, session("next", 11, [10, 10])])).toHaveLength(0);
  });
  it("keeps different count achievements distinct and read after units or row IDs change", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [10]), session("next", 11, [12, 12])]);
    const seen = achievements.map((item) => achievementNotificationKey(item, "lb"));
    expect(new Set(seen).size).toBe(3);
    expect(unreadAchievementKeys(achievements.map((item) => ({ ...item, id: "next:replacement:count", ...(item.kind === "volume" ? { currentVolume: convertWeight(item.currentVolume, "lb", "kg") } : {}) })), "kg", seen)).toEqual([]);
    expect(unreadAchievementKeys(achievements, "lb", [seen[0]])).toEqual(seen.slice(1));
  });
});

describe("total volume achievements", () => {
  it("recognizes a lighter final set catching up without changing max weight, sets or reps", () => {
    const monday = session("monday", 19, [10, 10, 10, 10], 80);
    monday.exercises[0].sets[3].weight = 65;
    const tuesday = session("tuesday", 20, [10, 10, 10, 10], 80);
    const before = structuredClone([monday, tuesday]);
    const achievements = buildPersonalBestAchievements([tuesday, monday]);
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({ kind: "volume", previousVolume: 3050, currentVolume: 3200, improvement: 150 });
    expect(achievements[0].percentage).toBeCloseTo(4.918, 3);
    expect([monday, tuesday]).toEqual(before);
  });
  it("recognizes extra reps in just one set and adds both rep and volume achievements", () => {
    const achievements = buildPersonalBestAchievements([session("monday", 19, [10, 10, 10, 10], 80), session("tuesday", 20, [10, 10, 10, 12], 80)]);
    expect(achievements.map((item) => item.kind)).toEqual(["reps", "volume"]);
    expect(achievements[0]).toMatchObject({ previousCount: 40, currentCount: 42, improvement: 2 });
    expect(achievements[1]).toMatchObject({ previousVolume: 3200, currentVolume: 3360, improvement: 160 });
  });
  it("compares to the last eligible log, including rebounds, but not equal or lower volume", () => {
    const baseline = session("baseline", 10, [10, 10], 80);
    const equal = session("equal", 11, [10, 10], 80);
    const lower = session("lower", 12, [10, 10], 60);
    const rebound = session("rebound", 13, [10, 10], 70);
    const achievements = buildPersonalBestAchievements([baseline, equal, lower, rebound]);
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({ kind: "volume", currentVolume: 1400, previousVolume: 1200, improvement: 200 });
    expect(buildPersonalBestAchievements([baseline])).toEqual([]);
  });
  it("ignores draft, warmup and incomplete volume and merges repeated exercise rows", () => {
    const first = session("first", 10, [10], 80);
    first.exercises.push({ ...first.exercises[0], id: "duplicate" });
    const next = session("next", 12, [10, 10, 100, 100], 80);
    next.exercises[0].sets[2].type = "warmup";
    next.exercises[0].sets[3].completed = false;
    const draft = { ...session("draft", 11, [100], 200), status: "draft" as const };
    expect(buildPersonalBestAchievements([first, draft, next])).toEqual([]);
  });
  it("does not manufacture volume from bodyweight-only sets or conversion noise", () => {
    expect(buildPersonalBestAchievements([session("first", 10, [10], 0), session("next", 11, [10], 0)])).toEqual([]);
    const first = session("first", 10, [10, 10], 80);
    const next = session("next", 11, [10, 10], 80 + 1e-12);
    expect(buildPersonalBestAchievements([first, next]).filter((item) => item.kind === "volume")).toEqual([]);
    const fromZero = buildPersonalBestAchievements([session("zero", 10, [10], 0), session("weighted", 11, [10], 10)]).find((item) => item.kind === "volume");
    expect(fromZero).toMatchObject({ previousVolume: 0, currentVolume: 100, percentage: null });
  });
});
