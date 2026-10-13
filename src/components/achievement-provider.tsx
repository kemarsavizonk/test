"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { APP_REFRESH, type AppRefreshEvent } from "@/lib/app-refresh";
import { buildPersonalBestAchievements } from "@/lib/fitness";
import { achievementNotificationKey, unreadAchievementKeys } from "@/lib/achievement-notifications";
import { getCurrentUser, getPreferredWeightUnit, listWorkouts, WORKOUTS_CHANGED } from "@/lib/workout-repository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PersonalBestAchievement, WeightUnit } from "@/lib/types";

interface AchievementState {
  achievements: PersonalBestAchievement[];
  unit: WeightUnit;
  loading: boolean;
  error: string;
  unreadCount: number;
  visitNewKeys: string[];
}

const initialState: AchievementState = { achievements: [], unit: "lb", loading: true, error: "", unreadCount: 0, visitNewKeys: [] };
const AchievementContext = createContext<AchievementState>(initialState);

function readSeen(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

export function AchievementProvider({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState(initialState);
  const visitNewKeys = useRef<string[]>([]);
  const seenCache = useRef(new Map<string, string[]>());

  useEffect(() => {
    let active = true;
    let request = 0;
    const onAchievements = path === "/dashboard/achievements";
    if (!onAchievements) visitNewKeys.current = [];

    const refresh = async () => {
      const currentRequest = ++request;
      try {
        const [workouts, unit, user] = await Promise.all([listWorkouts(), getPreferredWeightUnit(), getCurrentUser()]);
        if (!active || currentRequest !== request) return;
        const achievements = buildPersonalBestAchievements(workouts);
        const storageKey = `kemtech-achievements-seen-v1:${user?.id ?? "preview"}`;
        const cloudSeen: unknown = user?.user_metadata.kemtech_seen_achievements;
        const seen = [...new Set([...(seenCache.current.get(storageKey) ?? []), ...readSeen(storageKey), ...(Array.isArray(cloudSeen) ? cloudSeen.filter((key): key is string => typeof key === "string") : [])])];
        const unread = unreadAchievementKeys(achievements, unit, seen);

        if (onAchievements) {
          // Retain the celebration for this visit even after marking it read.
          // Leaving the tab ends the visit; the next visit shows the history.
          visitNewKeys.current = [...new Set([...visitNewKeys.current, ...unread])];
          const nextSeen = [...new Set([...seen, ...achievements.map((item) => achievementNotificationKey(item, unit))])];
          seenCache.current.set(storageKey, nextSeen);
          try { localStorage.setItem(storageKey, JSON.stringify(nextSeen)); } catch { /* In-memory read state still works if storage is unavailable. */ }
          setState({ achievements, unit, loading: false, error: "", unreadCount: 0, visitNewKeys: visitNewKeys.current });
          if (user && unread.length) {
            // Sync read state to the account without requiring a schema change.
            const client = createSupabaseBrowserClient();
            await client?.auth.updateUser({ data: { kemtech_seen_achievements: nextSeen } });
          }
        } else {
          setState({ achievements, unit, loading: false, error: "", unreadCount: unread.length, visitNewKeys: [] });
        }
      } catch (cause) {
        if (active && currentRequest === request) setState((old) => ({ ...old, loading: false, error: cause instanceof Error ? cause.message : "Could not load achievements." }));
      }
    };
    const update = () => { void refresh(); };
    const appRefresh = (event: Event) => (event as AppRefreshEvent).detail.waitUntil(refresh());
    const onStorage = (event: StorageEvent) => { if (event.key?.startsWith("kemtech-")) update(); };
    const onFocus = () => { if (document.visibilityState === "visible") update(); };
    update();
    window.addEventListener(APP_REFRESH, appRefresh);
    window.addEventListener(WORKOUTS_CHANGED, update);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener(APP_REFRESH, appRefresh);
      window.removeEventListener(WORKOUTS_CHANGED, update);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, [path]);

  return <AchievementContext.Provider value={state}>{children}</AchievementContext.Provider>;
}

export function useAchievements() { return useContext(AchievementContext); }
