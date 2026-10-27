"use client";

import { useEffect, useState } from "react";

/** Returns the current timestamp, updating on a fixed cadence aligned to the second. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => setNow(Date.now());
    const align = () => {
      tick();
      interval = setInterval(tick, intervalMs);
    };
    tick();
    const timeout = setTimeout(align, intervalMs - (Date.now() % intervalMs));
    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return now;
}
