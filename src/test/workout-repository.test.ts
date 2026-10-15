import { beforeEach, describe, expect, it, vi } from "vitest";
import { listWorkouts, saveWorkout, updateWorkout } from "@/lib/workout-repository";
import type { WorkoutSession } from "@/lib/types";

vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => null }));
beforeEach(() => localStorage.clear());

const workout = (id: string, weight: number): WorkoutSession => ({
  id, title: "Squat", status: "completed", performedAt: "2026-10-08T12:00:00Z", createdAt: "2026-10-08T12:00:00Z", updatedAt: "2026-10-08T12:00:00Z",
  exercises: [{ id: `exercise-${id}`, name: "Barbell Back Squat", muscleGroup: "Quadriceps", sets: [{ id: `set-${id}`, setNumber: 1, weight, repetitions: 10, completed: true, type: "working" }] }],
});

describe("preview workout entry units", () => {
  it("retains kg and lb on individual logs and converts them to the preferred display unit", async () => {
    await saveWorkout(workout("kg", 50), "kg");
    await saveWorkout(workout("lb", 110.231131), "lb");
    const stored = localStorage.getItem("kemtech-preview-workouts-v1");
    expect(JSON.parse(stored!)[1].weightUnit).toBe("kg");
    expect((await listWorkouts()).find((item) => item.id === "kg")!.exercises[0].sets[0].weight).toBeCloseTo(110.2311, 3);
    localStorage.setItem("kemtech-preview-settings", JSON.stringify({ unit: "kg" }));
    for (const item of await listWorkouts()) expect(item.exercises[0].sets[0].weight).toBeCloseTo(50, 3);
    expect(localStorage.getItem("kemtech-preview-workouts-v1")).toBe(stored);
  });
  it("stores the new entry unit on edits without changing the physical weight", async () => {
    await saveWorkout(workout("edited", 50), "kg");
    const displayed = (await listWorkouts())[0];
    await updateWorkout(displayed, "lb");
    localStorage.setItem("kemtech-preview-settings", JSON.stringify({ unit: "kg" }));
    expect((await listWorkouts())[0].exercises[0].sets[0].weight).toBeCloseTo(50, 6);
  });
  it("keeps legacy untagged logs readable without rewriting stored history", async () => {
    const legacy = workout("legacy", 50);
    const stored = JSON.stringify([legacy]);
    localStorage.setItem("kemtech-preview-workouts-v1", stored);
    expect(await listWorkouts()).toEqual([legacy]);
    localStorage.setItem("kemtech-preview-settings", JSON.stringify({ unit: "kg" }));
    expect(await listWorkouts()).toEqual([legacy]);
    expect(localStorage.getItem("kemtech-preview-workouts-v1")).toBe(stored);
  });
});
