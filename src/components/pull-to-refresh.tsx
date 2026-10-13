"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDisplay } from "@/hooks/use-app-display";
import { refreshAppData } from "@/lib/app-refresh";

export function PullToRefresh() {
  const mode = useAppDisplay();
  const router = useRouter();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (mode !== "standalone") return;
    document.documentElement.classList.add("standalone-app");
    let start: { x: number; y: number } | null = null;
    let pull = 0;
    let busy = false;
    let active = true;
    const reset = () => { start = null; pull = 0; setDistance(0); };
    const touchStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      if (busy || event.touches.length !== 1 || window.scrollY > 0 || target.closest("input, select, textarea, button, a, [role=listbox], [data-no-refresh]")) return;
      // Do not steal scroll gestures from a nested scrollable region.
      for (let node = target; node && node !== document.body; node = node.parentElement!) {
        if (node.scrollHeight > node.clientHeight && /auto|scroll/.test(getComputedStyle(node).overflowY)) return;
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const touchMove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const x = event.touches[0].clientX - start.x;
      const y = event.touches[0].clientY - start.y;
      if (y <= 0 || Math.abs(x) > y || window.scrollY > 0) { reset(); return; }
      if (event.cancelable) event.preventDefault();
      pull = Math.min(100, y * .55);
      setDistance(pull);
    };
    const touchEnd = async () => {
      const shouldRefresh = pull >= 70;
      reset();
      if (!shouldRefresh || busy) return;
      busy = true;
      setRefreshing(true);
      try {
        await refreshAppData();
        if (active) router.refresh();
      } finally {
        busy = false;
        if (active) setRefreshing(false);
      }
    };
    document.addEventListener("touchstart", touchStart, { passive: true });
    document.addEventListener("touchmove", touchMove, { passive: false });
    document.addEventListener("touchend", touchEnd);
    document.addEventListener("touchcancel", reset);
    return () => {
      active = false;
      document.documentElement.classList.remove("standalone-app");
      document.removeEventListener("touchstart", touchStart);
      document.removeEventListener("touchmove", touchMove);
      document.removeEventListener("touchend", touchEnd);
      document.removeEventListener("touchcancel", reset);
    };
  }, [mode, router]);

  return distance > 8 || refreshing ? <div className="pull-refresh" role="status"><RefreshCw size={18} className={refreshing ? "refresh-spinning" : ""} />{refreshing ? "Refreshing…" : distance >= 70 ? "Release to refresh" : "Pull to refresh"}</div> : null;
}
