import { describe, expect, it } from "vitest";
import { achievementNotificationKey, unreadAchievementKeys } from "@/lib/achievement-notifications";
import { convertWeight } from "@/lib/fitness";
import type { PersonalBestAchievement } from "@/lib/types";

const record: PersonalBestAchievement = {
  id: "session-1:exercise-1:max-weight", kind: "weight", exerciseName: "Barbell Back Squat", achievedAt: "2026-10-12T12:00:00Z",
  currentWeight: 55, previousWeight: 50, improvement: 5, percentage: 10, repetitions: 10, volumeImprovementPercentage: 10,
};

describe("achievement notifications", () => {
  it("does not alert again when units change or an edited workout gets a new exercise row ID", () => {
    const seen = [achievementNotificationKey(record, "kg")];
    const edited = { ...record, id: "session-1:replacement-row:max-weight", currentWeight: convertWeight(55, "kg", "lb") };
    expect(unreadAchievementKeys([edited], "lb", seen)).toEqual([]);
  });
  it("alerts for a higher personal best while keeping previous records read", () => {
    const seen = [achievementNotificationKey(record, "kg")];
    const next = { ...record, id: "session-2:exercise-2:max-weight", currentWeight: 60 };
    expect(unreadAchievementKeys([record, next], "kg", seen)).toEqual([achievementNotificationKey(next, "kg")]);
  });
});
