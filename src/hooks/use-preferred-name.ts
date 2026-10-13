"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { loadProfileSettings, preferredName, PREVIEW_PROFILE_KEY, PROFILE_CHANGED } from "@/lib/profile-repository";
import { APP_REFRESH, type AppRefreshEvent } from "@/lib/app-refresh";

export function usePreferredName() {
  const path = usePathname();
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    let request = 0;
    const refresh = async () => {
      const current = ++request;
      try { const profile = await loadProfileSettings(); if (active && current === request) setName(preferredName(profile)); }
      catch { if (active && current === request) setName(""); }
    };
    const update = () => { void refresh(); };
    const storage = (event: StorageEvent) => { if (event.key === PREVIEW_PROFILE_KEY || event.key === null) update(); };
    const appRefresh = (event: Event) => (event as AppRefreshEvent).detail.waitUntil(refresh());
    update();
    window.addEventListener(PROFILE_CHANGED, update);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", update);
    window.addEventListener(APP_REFRESH, appRefresh);
    return () => { active = false; window.removeEventListener(PROFILE_CHANGED, update); window.removeEventListener("storage", storage); window.removeEventListener("focus", update); window.removeEventListener(APP_REFRESH, appRefresh); };
  }, [path]);
  return name;
}
