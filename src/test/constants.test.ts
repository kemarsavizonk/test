import { describe, expect, it } from "vitest";
import { EXERCISE_GROUPS, STARTER_EXERCISES } from "@/lib/constants";

describe("approved exercise catalog", () => {
  it("contains every requested exercise in the expected groups", () => {
    expect(EXERCISE_GROUPS.map((group) => group.exercises.length)).toEqual([24, 27, 24, 20, 20, 20, 13, 16, 12, 22, 16, 19, 16]);
    expect(STARTER_EXERCISES).toHaveLength(249);
  });

  it("does not contain duplicate exercise names", () => {
    expect(new Set(STARTER_EXERCISES.map((exercise) => exercise.name.toLocaleLowerCase())).size).toBe(STARTER_EXERCISES.length);
  });
});
