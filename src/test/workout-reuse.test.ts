import { describe, expect, it } from "vitest";
import { buildSuggestedWorkoutPlan, copyExercise, previousExerciseLogs } from "@/lib/workout-reuse";
import type { WorkoutSession } from "@/lib/types";

function session(id: string, day: string, name = "Barbell Back Squat", weight = 50): WorkoutSession {
  const date = `${day}T12:00:00`;
  return { id, title: name, status: "completed", performedAt: date, createdAt: date, updatedAt: date, exercises: [{ id: `exercise-${id}`, name, muscleGroup: "Quadriceps", equipment: "Barbell", notes: "Keep this note", sets: [1, 2].map((index) => ({ id: `set-${id}-${index}`, setNumber: index, weight, repetitions: 10, rpe: 7, completed: true, type: "working" })) }] };
}

describe("copying workouts", () => {
  it("makes independent exercises and sets with new IDs, converted weights and preserved details", () => {
    const source = session("source", "2026-10-08").exercises[0];
    const before = structuredClone(source);
    const copied = copyExercise(source, { from: "kg", to: "lb" });
    expect(copied.id).not.toBe(source.id);
    expect(copied.sets[0].id).not.toBe(source.sets[0].id);
    expect(copied.sets[0]).toMatchObject({ repetitions: 10, rpe: 7, completed: true, type: "working", setNumber: 1 });
    expect(copied.sets[0].weight).toBeCloseTo(110.231, 2);
    copied.sets[0].repetitions = 20;
    expect(source).toEqual(before);
    expect(copyExercise(source, { completed: false }).sets.every((set) => !set.completed)).toBe(true);
  });
  it("finds the latest completed matching exercise, skipping drafts and incomplete-only logs", () => {
    const first = session("first", "2026-10-01");
    const latest = session("latest", "2026-10-08");
    const draft = { ...session("draft", "2026-10-10"), status: "draft" as const };
    const incomplete = session("incomplete", "2026-10-11"); incomplete.exercises[0].sets.forEach((set) => { set.completed = false; });
    expect(previousExerciseLogs([first, latest, draft, incomplete], " BARBELL   BACK SQUAT ").map((log) => log.workout.id)).toEqual(["latest", "first"]);
  });
});

describe("weekday suggestions", () => {
  const today = new Date("2026-10-15T12:00:00");
  it("uses observed weekday frequency and the latest completed sets without changing history", () => {
    const history = [session("older", "2026-09-24"), session("first", "2026-10-01"), session("second", "2026-10-08"), session("recent", "2026-10-13", "Barbell Back Squat", 60), session("other-day", "2026-10-09", "Dumbbell Shoulder Press"), session("one-off", "2026-10-08", "Leg Press")];
    const before = structuredClone(history);
    const plan = buildSuggestedWorkoutPlan(history, today);
    expect(plan).toMatchObject({ weekday: "Thursday", trainingDays: 3, date: "2026-10-15" });
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0].exercise.sets[0].weight).toBe(60);
    expect(plan.entries[0].performedAt).toContain("2026-10-13");
    expect(history).toEqual(before);
  });
  it("excludes drafts, future dates, today's entries, old routines and incomplete sets", () => {
    const previous = session("previous", "2026-10-08"); previous.exercises[0].sets[1].completed = false;
    const drafts = { ...session("draft", "2026-10-08", "Leg Press"), status: "draft" as const };
    const plan = buildSuggestedWorkoutPlan([previous, drafts, session("future", "2026-10-22", "Leg Press"), session("today", "2026-10-15", "Leg Press"), session("old", "2026-07-02", "Leg Press")], today);
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0].exercise.sets).toHaveLength(1);
    expect(plan.trainingDays).toBe(1);
  });
  it("does not invent a routine when there is no matching weekday history", () => {
    expect(buildSuggestedWorkoutPlan([], today).entries).toEqual([]);
    expect(buildSuggestedWorkoutPlan([session("other-day", "2026-10-13")], today).entries).toEqual([]);
    const warmupOnly = session("warmup", "2026-10-08"); warmupOnly.exercises[0].sets.forEach((set) => { set.type = "warmup"; });
    expect(buildSuggestedWorkoutPlan([warmupOnly], today).entries).toEqual([]);
  });
});
