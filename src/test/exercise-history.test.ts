import { describe, expect, it } from "vitest";
import { buildExerciseHistory } from "@/lib/exercise-history";
import type { WorkoutSession } from "@/lib/types";

function workout(id: string, weight: number, day: number, status: "completed" | "draft" = "completed"): WorkoutSession {
  return { id, title: id, status, performedAt: `2026-10-${day}T12:00:00Z`, createdAt: `2026-10-${day}T12:00:00Z`, updatedAt: `2026-10-${day}T12:00:00Z`, exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", sets: [{ id: `set-${id}`, setNumber: 1, weight, repetitions: 10, completed: true, type: "working" }] }] };
}

describe("exercise history", () => {
  it("groups repeated exercises once and orders logs newest first with decrease, equality and increase", () => {
    const histories = buildExerciseHistory([workout("b", 60, 11), workout("a", 50, 10), workout("d", 55, 13), workout("c", 60, 12)]);
    expect(histories).toHaveLength(1);
    expect(histories[0].logs.map((item) => item.workout.id)).toEqual(["d", "c", "b", "a"]);
    expect(histories[0].logs.map((item) => item.difference)).toEqual([-5, 0, 10, null]);
  });
  it("separates exercises from the same session and merges repeated blocks for one exercise within it", () => {
    const session = workout("a", 50, 10);
    session.exercises.push({ ...session.exercises[0], id: "duplicate-block", name: "  BARBELL   BACK SQUAT  " });
    session.exercises.push({ ...session.exercises[0], id: "bench", name: "Barbell Bench Press", muscleGroup: "Chest" });
    const histories = buildExerciseHistory([session]);
    expect(histories).toHaveLength(2);
    const squat = histories.find((item) => item.key === "barbell back squat")!;
    expect(squat.logs).toHaveLength(1);
    expect(squat.logs[0].exercise.sets).toHaveLength(2);
    expect(squat.logs[0].exerciseIds).toEqual(["exercise-a", "duplicate-block"]);
  });
  it("does not use drafts or warmups as the previous working weight", () => {
    const warmup = workout("warmup", 100, 12);
    warmup.exercises[0].sets[0].type = "warmup";
    const history = buildExerciseHistory([workout("first", 50, 10), workout("draft", 90, 11, "draft"), warmup, workout("latest", 55, 13)])[0];
    expect(history.logs[0]).toMatchObject({ previousWeight: 50, difference: 5 });
    expect(history.logs[2].difference).toBeNull();
  });
});
