"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { STARTER_EXERCISES } from "@/lib/constants";
import { EXERCISES_CHANGED, listExerciseCatalog, type CatalogExercise } from "@/lib/exercise-repository";

export function useExerciseCatalog() {
  const path = usePathname();
  const [catalog, setCatalog] = useState<CatalogExercise[]>(STARTER_EXERCISES.map((item) => ({ ...item, isCustom: false })));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await listExerciseCatalog();
        if (active) { setCatalog(items); setError(""); }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Could not load your exercises."); }
      finally { if (active) setLoading(false); }
    };
    const update = () => { void load(); };
    update();
    window.addEventListener(EXERCISES_CHANGED, update);
    return () => { active = false; window.removeEventListener(EXERCISES_CHANGED, update); };
  }, [path]);
  return { catalog, loading, error };
}
