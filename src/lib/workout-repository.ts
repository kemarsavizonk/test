"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { STARTER_EXERCISES } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fromCanonicalKg, normalizeExerciseName, toCanonicalKg } from "@/lib/fitness";
import type { WeightUnit, WorkoutSession } from "@/lib/types";

const LOCAL_KEY = "kemtech-preview-workouts-v1";
const APPROVED_EXERCISES = new Set(STARTER_EXERCISES.map((exercise) => normalizeExerciseName(exercise.name)));

interface DatabaseSet {
  id: string;
  set_number: number;
  weight_kg: number | string;
  repetitions: number;
  is_completed: boolean;
  set_type: "warmup" | "working" | "drop" | "failure";
  perceived_exertion: number | null;
}

interface DatabaseWorkoutExercise {
  id: string;
  notes: string | null;
  sort_order: number;
  exercises: { id: string; name: string; muscle_groups: { name: string } | null } | null;
  workout_sets: DatabaseSet[];
}

interface DatabaseWorkout {
  id: string;
  title: string;
  performed_at: string;
  completed_at: string | null;
  status: "draft" | "completed";
  notes: string | null;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
  workout_exercises: DatabaseWorkoutExercise[];
}

interface ExerciseMetadata {
  kemtech: 1;
  muscleGroup: string;
  equipment?: string;
  notes?: string;
}

function encodeExerciseMetadata(item: WorkoutSession["exercises"][number]) {
  return JSON.stringify({
    kemtech: 1,
    muscleGroup: item.muscleGroup,
    equipment: item.equipment || undefined,
    notes: item.notes || undefined,
  } satisfies ExerciseMetadata);
}

function decodeExerciseMetadata(value: string | null, fallbackMuscleGroup: string) {
  if (!value) return { muscleGroup: fallbackMuscleGroup, notes: undefined, equipment: undefined };
  try {
    const parsed = JSON.parse(value) as Partial<ExerciseMetadata>;
    if (parsed.kemtech === 1 && typeof parsed.muscleGroup === "string") {
      return {
        muscleGroup: parsed.muscleGroup,
        equipment: typeof parsed.equipment === "string" ? parsed.equipment : undefined,
        notes: typeof parsed.notes === "string" ? parsed.notes : undefined,
      };
    }
  } catch {
    // Existing workouts may contain unstructured notes; keep them intact.
  }
  return { muscleGroup: fallbackMuscleGroup, notes: value, equipment: undefined };
}

function readLocal(): WorkoutSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as WorkoutSession[];
  } catch {
    return [];
  }
}

function writeLocal(workouts: WorkoutSession[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(workouts));
}

export async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getPreferredWeightUnit(): Promise<WeightUnit> {
  const supabase = createSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    try {
      const settings = JSON.parse(localStorage.getItem("kemtech-preview-settings") ?? "{}");
      return settings.unit === "kg" ? "kg" : "lb";
    } catch { return "lb"; }
  }
  const { data } = await supabase.from("profiles").select("preferred_weight_unit").eq("id", user.id).maybeSingle();
  return data?.preferred_weight_unit === "kg" ? "kg" : "lb";
}

async function insertWorkoutExercises(supabase: SupabaseClient, userId: string, sessionId: string, workout: WorkoutSession, displayUnit: WeightUnit) {
  for (const [sortOrder, item] of workout.exercises.entries()) {
    const normalizedName = normalizeExerciseName(item.name);
    if (!APPROVED_EXERCISES.has(normalizedName)) throw new Error(`“${item.name}” is not in the approved exercise list.`);
    let { data: exercise } = await supabase.from("exercises").select("id").eq("normalized_name", normalizedName).or(`user_id.eq.${userId},user_id.is.null`).limit(1).maybeSingle();
    if (!exercise) {
      let { data: muscleGroup } = await supabase.from("muscle_groups").select("id").eq("name", item.muscleGroup).or(`user_id.eq.${userId},user_id.is.null`).limit(1).maybeSingle();
      if (!muscleGroup) {
        const groupResult = await supabase.from("muscle_groups").insert({ user_id: userId, name: item.muscleGroup }).select("id").single();
        if (groupResult.error) throw groupResult.error;
        muscleGroup = groupResult.data;
      }
      const result = await supabase.from("exercises").insert({ user_id: userId, name: item.name, normalized_name: normalizedName, primary_muscle_group_id: muscleGroup.id, equipment_type: item.equipment ?? null }).select("id").single();
      if (result.error) throw result.error;
      exercise = result.data;
    }
    const { data: workoutExercise, error: itemError } = await supabase.from("workout_exercises").insert({ workout_session_id: sessionId, exercise_id: exercise.id, sort_order: sortOrder, notes: encodeExerciseMetadata(item) }).select("id").single();
    if (itemError) throw itemError;
    const { error: setsError } = await supabase.from("workout_sets").insert(item.sets.map((set) => ({ workout_exercise_id: workoutExercise.id, set_number: set.setNumber, weight_kg: toCanonicalKg(set.weight, displayUnit), repetitions: set.repetitions, is_completed: set.completed, set_type: set.type, perceived_exertion: set.rpe ?? null })));
    if (setsError) throw setsError;
  }
}

export async function listWorkouts(): Promise<WorkoutSession[]> {
  const supabase = createSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return readLocal();

  const { data, error } = await supabase
    .from("workout_sessions")
    .select(`
      id, title, performed_at, completed_at, status, notes, duration_minutes, created_at, updated_at,
      workout_exercises (
        id, notes, sort_order,
        exercises (id, name, muscle_groups(name)),
        workout_sets (id, set_number, weight_kg, repetitions, is_completed, set_type, perceived_exertion)
      )
    `)
    .order("performed_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_weight_unit")
    .eq("id", user.id)
    .maybeSingle();
  const displayUnit: WeightUnit = profile?.preferred_weight_unit === "kg" ? "kg" : "lb";

  return ((data ?? []) as unknown as DatabaseWorkout[]).map((row) => ({
    id: row.id,
    title: row.title,
    performedAt: row.performed_at,
    completedAt: row.completed_at ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exercises: (row.workout_exercises ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => {
        const metadata = decodeExerciseMetadata(item.notes, item.exercises?.muscle_groups?.name ?? "Other");
        return {
          id: item.id,
          exerciseId: item.exercises?.id,
          name: item.exercises?.name ?? "Exercise",
          muscleGroup: metadata.muscleGroup,
          equipment: metadata.equipment,
          notes: metadata.notes,
          sets: (item.workout_sets ?? [])
            .sort((a, b) => a.set_number - b.set_number)
            .map((set) => ({
              id: set.id,
              setNumber: set.set_number,
              weight: fromCanonicalKg(Number(set.weight_kg), displayUnit),
              repetitions: set.repetitions,
              completed: set.is_completed,
              type: set.set_type,
              rpe: set.perceived_exertion ?? undefined,
            })),
        };
      }),
  }));
}

export async function saveWorkout(workout: WorkoutSession, displayUnit: WeightUnit) {
  const invalid = workout.exercises.find((item) => !APPROVED_EXERCISES.has(normalizeExerciseName(item.name)));
  if (invalid) throw new Error(`“${invalid.name}” is not in the approved exercise list.`);
  const supabase = createSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    const existing = readLocal();
    const next = [workout, ...existing.filter((item) => item.id !== workout.id)];
    writeLocal(next);
    return workout;
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      title: workout.title,
      performed_at: workout.performedAt,
      completed_at: workout.completedAt ?? null,
      status: workout.status,
      notes: workout.notes ?? null,
      duration_minutes: workout.durationMinutes ?? null,
    })
    .select("id")
    .single();
  if (sessionError) throw sessionError;

  await insertWorkoutExercises(supabase, user.id, session.id, workout, displayUnit);
  return { ...workout, id: session.id };
}

export async function updateWorkout(workout: WorkoutSession, displayUnit: WeightUnit) {
  const invalid = workout.exercises.find((item) => !APPROVED_EXERCISES.has(normalizeExerciseName(item.name)));
  if (invalid) throw new Error(`“${invalid.name}” is not in the approved exercise list.`);
  const supabase = createSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    writeLocal([workout, ...readLocal().filter((item) => item.id !== workout.id)]);
    return workout;
  }
  const { error: sessionError } = await supabase.from("workout_sessions").update({ title: workout.title, performed_at: workout.performedAt, completed_at: workout.completedAt ?? null, status: workout.status, notes: workout.notes ?? null, duration_minutes: workout.durationMinutes ?? null }).eq("id", workout.id).eq("user_id", user.id);
  if (sessionError) throw sessionError;
  const { error: deleteError } = await supabase.from("workout_exercises").delete().eq("workout_session_id", workout.id);
  if (deleteError) throw deleteError;
  await insertWorkoutExercises(supabase, user.id, workout.id, workout, displayUnit);
  return workout;
}

export async function deleteWorkout(id: string) {
  const supabase = createSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    writeLocal(readLocal().filter((item) => item.id !== id));
    return;
  }
  const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
  if (error) throw error;
}
