"use client";

import { useCallback, useEffect, useState } from "react";
import { getPreferredWeightUnit, listWorkouts } from "@/lib/workout-repository";
import type { WeightUnit, WorkoutSession } from "@/lib/types";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]); const [unit, setUnit] = useState<WeightUnit>("lb"); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const refresh = useCallback(async () => { try { setLoading(true); const [items, preferredUnit] = await Promise.all([listWorkouts(), getPreferredWeightUnit()]); setWorkouts(items); setUnit(preferredUnit); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load workouts."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    Promise.all([listWorkouts(), getPreferredWeightUnit()])
      .then(([items, preferredUnit]) => { if (active) { setWorkouts(items); setUnit(preferredUnit); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load workouts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { workouts, unit, loading, error, refresh };
}
