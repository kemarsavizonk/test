"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { APP_REFRESH, type AppRefreshEvent } from "@/lib/app-refresh";
import { PROFILE_CHANGED } from "@/lib/profile-repository";
import { BODY_WEIGHT_CHANGED, listBodyWeights } from "@/lib/body-weight-repository";
import { getPreferredWeightUnit } from "@/lib/workout-repository";
import type { BodyWeightEntry } from "@/lib/body-weight";
import type { WeightUnit } from "@/lib/types";

export function useBodyWeight() {
  const path = usePathname();
  const [state, setState] = useState({ entries: [] as BodyWeightEntry[], unit: "lb" as WeightUnit, loading: true, error: "" });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    let request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const [entries, unit] = await Promise.all([listBodyWeights(), getPreferredWeightUnit()]);
        if (active && current === request) setState({ entries, unit, loading: false, error: "" });
      } catch (cause) { if (active && current === request) setState((old) => ({ ...old, loading: false, error: cause instanceof Error ? cause.message : "Could not load body-weight history." })); }
    };
    const update = () => { void load(); };
    const appRefresh = (event: Event) => (event as AppRefreshEvent).detail.waitUntil(load());
    const storage = (event: StorageEvent) => { if (event.key?.startsWith("kemtech-")) update(); };
    update();
    window.addEventListener(BODY_WEIGHT_CHANGED, update); window.addEventListener(PROFILE_CHANGED, update); window.addEventListener(APP_REFRESH, appRefresh); window.addEventListener("storage", storage); window.addEventListener("focus", update);
    return () => { active = false; window.removeEventListener(BODY_WEIGHT_CHANGED, update); window.removeEventListener(PROFILE_CHANGED, update); window.removeEventListener(APP_REFRESH, appRefresh); window.removeEventListener("storage", storage); window.removeEventListener("focus", update); };
  }, [path, revision]);
  return { ...state, refresh };
}
