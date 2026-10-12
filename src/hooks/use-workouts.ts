"use client";

import { useCallback, useEffect, useState } from "react";
import { listWorkouts } from "@/lib/workout-repository";
import type { WorkoutSession } from "@/lib/types";

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const refresh = useCallback(async () => { try { setLoading(true); setWorkouts(await listWorkouts()); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load workouts."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    listWorkouts()
      .then((items) => { if (active) { setWorkouts(items); setError(""); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load workouts."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { workouts, loading, error, refresh };
}
