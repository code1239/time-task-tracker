"use client";

import { useEffect } from "react";
import { getIstanbulTimeParts } from "@/lib/date";
import type { RefObject } from "react";

type TimeRefs = {
  hourEl: RefObject<HTMLElement | null>;
  minuteEl: RefObject<HTMLElement | null>;
  secondEl: RefObject<HTMLElement | null>;
  dateEl: RefObject<HTMLElement | null>;
};

export function useIstanbulTime(refs: TimeRefs) {
  useEffect(() => {
    let raf = 0;
    let lastDateKey = "";

    const tick = () => {
      const now = new Date();
      const p = getIstanbulTimeParts(now);

      const hEl = refs.hourEl.current;
      const mEl = refs.minuteEl.current;
      const sEl = refs.secondEl.current;
      const dEl = refs.dateEl.current;

      if (hEl) hEl.textContent = String(p.hour).padStart(2, "0");
      if (mEl) mEl.textContent = String(p.minute).padStart(2, "0");
      if (sEl) sEl.textContent = String(p.second).padStart(2, "0");

      if (dEl) {
        const dateStr = now.toLocaleDateString("tr-TR", {
          timeZone: "Europe/Istanbul",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        if (dateStr !== lastDateKey) {
          lastDateKey = dateStr;
          dEl.textContent = dateStr;
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [refs.hourEl, refs.minuteEl, refs.secondEl, refs.dateEl]);
}

