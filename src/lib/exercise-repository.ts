"use client";

import { MUSCLE_GROUPS, STARTER_EXERCISES } from "@/lib/constants";
import { createId, normalizeExerciseName } from "@/lib/fitness";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface CatalogExercise {
  id?: string;
  name: string;
  muscleGroup: string;
  equipment?: string;
  isCustom: boolean;
}

export const EXERCISES_CHANGED = "kemtech-exercises-changed";
const LOCAL_KEY = "kemtech-preview-exercises-v1";
const starterCatalog: CatalogExercise[] = STARTER_EXERCISES.map((item) => ({ ...item, isCustom: false }));

function readLocal(): CatalogExercise[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as CatalogExercise[]; } catch { return []; }
}

export async function listExerciseCatalog(): Promise<CatalogExercise[]> {
  const client = createSupabaseBrowserClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const catalog = new Map(starterCatalog.map((item) => [normalizeExerciseName(item.name), item]));
  if (!client || !user) {
    // Keep older preview logs editable even if their names predate the catalog.
    try {
      const workouts = JSON.parse(localStorage.getItem("kemtech-preview-workouts-v1") ?? "[]");
      for (const workout of workouts) for (const item of workout.exercises) {
        const key = normalizeExerciseName(item.name);
        if (!catalog.has(key)) catalog.set(key, { name: item.name, muscleGroup: item.muscleGroup, equipment: item.equipment, isCustom: true });
      }
    } catch { /* The preset and saved custom catalog remain available. */ }
    for (const item of readLocal()) catalog.set(normalizeExerciseName(item.name), item);
  } else {
    const pageSize = 200;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await client.from("exercises")
        .select("id, user_id, name, equipment_type, muscle_groups(name)")
        .eq("is_archived", false).order("name").order("id").range(offset, offset + pageSize - 1);
      if (error) throw error;
      const rows = (data ?? []) as unknown as { id: string; user_id: string | null; name: string; equipment_type: string | null; muscle_groups: { name: string } | null }[];
      for (const row of rows) {
        const key = normalizeExerciseName(row.name);
        const preset = catalog.get(key);
        catalog.set(key, { id: row.id, name: preset?.name ?? row.name, muscleGroup: preset?.muscleGroup ?? row.muscle_groups?.name ?? "Chest", equipment: preset?.equipment ?? row.equipment_type ?? undefined, isCustom: row.user_id === user.id && !preset });
      }
      if (rows.length < pageSize) break;
    }
  }
  return [...catalog.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomExercise(input: { name: string; muscleGroup: string; equipment?: string }) {
  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name || name.length > 100) throw new Error("Enter an exercise name between 1 and 100 characters.");
  if (!MUSCLE_GROUPS.some((group) => group === input.muscleGroup)) throw new Error("Choose a muscle group.");
  const equipment = input.equipment?.trim() || undefined;
  if (equipment && equipment.length > 100) throw new Error("Keep the equipment name under 100 characters.");
  const key = normalizeExerciseName(name);
  const catalog = await listExerciseCatalog();
  if (catalog.some((item) => normalizeExerciseName(item.name) === key)) throw new Error("This exercise already exists. Search for it in the workout logger.");
  const client = createSupabaseBrowserClient();
  const user = client ? (await client.auth.getUser()).data.user : null;
  const exercise: CatalogExercise = { id: createId(), name, muscleGroup: input.muscleGroup, equipment, isCustom: true };
  if (!client || !user) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...readLocal(), exercise]));
  } else {
    const { data: existingGroup, error: groupError } = await client.from("muscle_groups").select("id").eq("name", input.muscleGroup).limit(1).maybeSingle();
    if (groupError) throw groupError;
    let group = existingGroup;
    if (!group) {
      const result = await client.from("muscle_groups").insert({ user_id: user.id, name: input.muscleGroup }).select("id").single();
      if (result.error) throw result.error;
      group = result.data;
    }
    const { data, error } = await client.from("exercises").insert({ user_id: user.id, name, normalized_name: key, primary_muscle_group_id: group.id, equipment_type: equipment ?? null }).select("id").single();
    if (error) throw new Error(error.code === "23505" ? "This exercise already exists. Search for it in the workout logger." : error.message);
    exercise.id = data.id;
  }
  window.dispatchEvent(new Event(EXERCISES_CHANGED));
  return exercise;
}
