import { describe, expect, it } from "vitest";
import { buildExerciseHistory, filterExerciseHistory, type HistoryFilters } from "@/lib/exercise-history";
import type { WorkoutSession } from "@/lib/types";

const defaults: HistoryFilters = { query: "", status: "all", muscleGroup: "all", fromDate: "", toDate: "" };
function session(id: string, date: string, muscleGroup: string, status: "draft" | "completed" = "completed"): WorkoutSession {
  return { id, title: id, status, performedAt: date, createdAt: date, updatedAt: date, exercises: [{ id, name: "Custom Press", muscleGroup, sets: [{ id, setNumber: 1, weight: 50, repetitions: 10, completed: true, type: "working" }] }] };
}

describe("history filters", () => {
  const histories = buildExerciseHistory([session("old", "2026-10-10T00:00:00", "Chest"), session("middle", "2026-10-11T23:59:59", "Shoulders"), session("new", "2026-10-12T12:00:00", "Chest", "draft")]);
  it("matches dates inclusively in the same local date used by the history display", () => {
    expect(filterExerciseHistory(histories, { ...defaults, fromDate: "2026-10-11", toDate: "2026-10-11" })[0].logs.map((log) => log.workout.id)).toEqual(["middle"]);
    expect(filterExerciseHistory(histories, { ...defaults, toDate: "2026-10-10" })[0].logs.map((log) => log.workout.id)).toEqual(["old"]);
  });
  it("combines muscle, date, status and exercise search on the same log", () => {
    const matching = filterExerciseHistory(histories, { ...defaults, query: " PRESS ", muscleGroup: "Chest", status: "completed", fromDate: "2026-10-10", toDate: "2026-10-12" });
    expect(matching[0].logs.map((log) => log.workout.id)).toEqual(["old"]);
    expect(filterExerciseHistory(histories, { ...defaults, muscleGroup: "Chest", fromDate: "2026-10-11", toDate: "2026-10-11" })).toEqual([]);
  });
  it("removes empty groups, rejects reversed ranges and leaves source history untouched", () => {
    expect(filterExerciseHistory(histories, { ...defaults, fromDate: "2026-10-12", toDate: "2026-10-10" })).toEqual([]);
    expect(histories[0].logs).toHaveLength(3);
    expect(filterExerciseHistory(histories, defaults)[0].logs).toHaveLength(3);
  });
});
