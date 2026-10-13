"use client";

import { useSyncExternalStore } from "react";

export function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function displayMode() {
  if (isStandaloneApp()) return "standalone";
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : "browser";
}

function subscribe(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function useAppDisplay() {
  return useSyncExternalStore(subscribe, displayMode, () => "unknown");
}
