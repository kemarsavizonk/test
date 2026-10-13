import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCustomExercise, listExerciseCatalog } from "@/lib/exercise-repository";

const client = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => client.current }));

beforeEach(() => { localStorage.clear(); client.current = null; });

describe("custom exercise storage", () => {
  it("persists an authenticated custom exercise under the current user's account", async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "private-exercise" }, error: null }) }) }));
    client.current = {
      auth: { getUser: async () => ({ data: { user: { id: "owner-id" } } }) },
      from: (table: string) => table === "exercises" ? {
        select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
        insert,
      } : { select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: "group-id" }, error: null }) }) }) }) },
    };
    const saved = await createCustomExercise({ name: "  Cable   Press / Rotation  ", muscleGroup: "Core and Abs", equipment: " Cable machine " });
    expect(insert).toHaveBeenCalledWith({ user_id: "owner-id", name: "Cable Press / Rotation", normalized_name: "cable press / rotation", primary_muscle_group_id: "group-id", equipment_type: "Cable machine" });
    expect(saved).toMatchObject({ id: "private-exercise", isCustom: true });
    expect(localStorage.getItem("kemtech-preview-exercises-v1")).toBeNull();
  });
  it("keeps preview exercises searchable after loading again and prevents duplicate preset names", async () => {
    await createCustomExercise({ name: "Custom Cable Rotation", muscleGroup: "Core and Abs" });
    expect((await listExerciseCatalog()).find((item) => item.name === "Custom Cable Rotation")).toMatchObject({ muscleGroup: "Core and Abs", isCustom: true });
    await expect(createCustomExercise({ name: " barbell   BACK squat ", muscleGroup: "Quadriceps" })).rejects.toThrow("already exists");
  });
});
