import { describe, expect, it } from "vitest";
import { buildPersonalBestAchievements } from "@/lib/fitness";
import { achievementNotificationKey, unreadAchievementKeys } from "@/lib/achievement-notifications";
import type { WorkoutSession } from "@/lib/types";

function session(id: string, day: number, reps: number[], weight = 50): WorkoutSession {
  const date = `2026-10-${day}T12:00:00Z`;
  return { id, title: "Squat", status: "completed", performedAt: date, createdAt: date, updatedAt: date, exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", sets: reps.map((repetitions, index) => ({ id: `set-${index}`, setNumber: index + 1, weight, repetitions, completed: true, type: "working" })) }] };
}

describe("rep and set achievements", () => {
  it("recognizes more total reps without needing heavier weight or more sets", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [10, 10]), session("next", 11, [12, 12])]);
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({ kind: "reps", previousCount: 20, currentCount: 24, improvement: 4 });
  });
  it("recognizes more sets independently even if total reps and weight decrease", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [20], 60), session("next", 11, [5, 5], 50)]);
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toMatchObject({ kind: "sets", previousCount: 1, currentCount: 2, improvement: 1 });
  });
  it("recognizes all three improvements and compares counts to the last log, not all-time records", () => {
    const achievements = buildPersonalBestAchievements([session("first", 10, [10]), session("next", 11, [12, 12], 55)]);
    expect(achievements.map((item) => item.kind).sort()).toEqual(["reps", "sets", "weight"]);
    const rebound = buildPersonalBestAchievements([session("best", 10, [20, 20, 20]), session("lower", 11, [10]), session("rebound", 12, [12, 12])]);
    expect(rebound.filter((item) => item.id.startsWith("rebound:"))).toHaveLength(2);
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
    expect(new Set(seen).size).toBe(2);
    expect(unreadAchievementKeys(achievements.map((item) => ({ ...item, id: "next:replacement:count" })), "kg", seen)).toEqual([]);
    expect(unreadAchievementKeys(achievements, "lb", [seen[0]])).toEqual([seen[1]]);
  });
});
