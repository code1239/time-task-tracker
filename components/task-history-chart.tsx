"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatShortDay } from "@/lib/date";

export type HistoryPoint = { date: string; count: number };

type Props = {
  data: HistoryPoint[];
  days: 7 | 30;
  today: string;
  loading: boolean;
};

/** Daily finished-task bars. Fills the box it is given; the card supplies the title. */
export function TaskHistoryChart({ data, days, today, loading }: Props) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const skeleton = data.length === 0;

  return (
    <div className="relative flex h-full min-h-[200px] flex-col rounded-[20px] glass-inset px-3 pb-2 pt-5 xl:min-h-0">
      <div className="relative flex min-h-[110px] flex-1 items-end gap-[3px] sm:gap-1">
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <div
            key={p}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line"
            style={{ bottom: `${p * 100}%` }}
          />
        ))}

        {skeleton
          ? Array.from({ length: days }).map((_, i) => (
              <div key={i} className="flex h-full flex-1 items-end justify-center">
                <div
                  className="w-full max-w-[26px] animate-pulse rounded-t-md bg-fg/10"
                  style={{ height: `${18 + ((i * 13) % 55)}%`, animationDelay: `${i * 60}ms` }}
                />
              </div>
            ))
          : data.map((point, i) => {
              const isToday = point.date === today;
              const height = (point.count / max) * 100;
              return (
                <div key={point.date} className="relative flex h-full flex-1 items-end justify-center">
                  <motion.button
                    type="button"
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${Math.max(height, 2.5)}%` }}
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 130, damping: 20, delay: i * 0.015 }
                    }
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setHovered((h) => (h === i ? null : i))}
                    aria-label={`${formatShortDay(point.date)}: ${point.count} görev`}
                    className={`relative w-full max-w-[34px] rounded-t-[6px] transition-[filter] duration-200 ${
                      isToday ? "shadow-[0_-4px_18px_-6px_var(--glow)]" : "hover:brightness-110"
                    }`}
                    style={{
                      background: isToday ? "var(--accent)" : "color-mix(in oklab, var(--accent) 38%, var(--card-sunk))",
                      opacity: loading ? 0.55 : 1,
                    }}
                  />

                  <AnimatePresence>
                    {hovered === i && (
                      <motion.div
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 3, scale: 0.97 }}
                        transition={{ duration: 0.16 }}
                        className="clay-sm pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-center"
                      >
                        <span className="tabular block text-[14px] font-semibold text-fg">{point.count}</span>
                        <span className="block text-[11px] font-semibold text-faint">{formatShortDay(point.date)}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
      </div>

      <div className="mt-2 flex shrink-0 gap-[3px] sm:gap-1">
        {skeleton
          ? Array.from({ length: days }).map((_, i) => <div key={i} className="flex-1" />)
          : data.map((point, i) => {
              const isToday = point.date === today;
              const showLabel = days === 7 || i === 0 || i === data.length - 1 || i % 5 === 0;
              return (
                <div key={point.date} className="flex flex-1 justify-center">
                  <span
                    className={`tabular block truncate text-center text-[9px] font-bold leading-none sm:text-[10px] ${
                      isToday ? "text-accent" : "text-faint"
                    } ${showLabel ? "opacity-100" : "opacity-0"}`}
                  >
                    {days === 7
                      ? formatShortDay(point.date).split(" ")[0]
                      : isToday
                        ? "Bugün"
                        : formatShortDay(point.date).split(" ")[1]}
                  </span>
                </div>
              );
            })}
      </div>

      {!skeleton && total === 0 && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <p className="clay-sm rounded-full px-3 py-1.5 text-[12px] font-bold text-muted">Henüz görev yok</p>
        </div>
      )}
    </div>
  );
}
