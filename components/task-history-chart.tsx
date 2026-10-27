"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatShortDay } from "@/lib/date";
import { TrendIcon } from "./icons";

export type HistoryPoint = { date: string; count: number };

type Props = {
  data: HistoryPoint[];
  days: 7 | 30;
  onDaysChange: (days: 7 | 30) => void;
  today: string;
  loading: boolean;
};

export function TaskHistoryChart({ data, days, onDaysChange, today, loading }: Props) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  const max = useMemo(() => Math.max(1, ...data.map((d) => d.count)), [data]);
  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);
  const skeleton = data.length === 0;

  return (
    <section aria-label="Görev geçmişi" className="mt-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">
            <TrendIcon className="size-4" />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold tracking-tight">Geçmiş</h3>
            <p className="text-[11px] text-faint">
              Son {days} gün · toplam{" "}
              <span className="font-mono text-muted">{total}</span> görev
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Grafik aralığı"
          className="glass-inset flex rounded-full p-0.5"
        >
          {([7, 30] as const).map((value) => {
            const active = days === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onDaysChange(value)}
                aria-pressed={active}
                className="relative rounded-full px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-fg aria-pressed:text-fg"
              >
                {active && (
                  <motion.span
                    layoutId="chart-range-indicator"
                    className="absolute inset-0 rounded-full bg-accent-soft ring-1 ring-inset ring-white/10"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className={`relative z-10 ${active ? "text-accent" : ""}`}>{value} gün</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative mt-4 rounded-2xl glass-inset px-3 pb-2 pt-6 sm:px-4">
        <div className="relative flex h-[132px] items-end gap-[3px] sm:h-[150px] sm:gap-1.5">
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
                        reduce
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 130, damping: 20, delay: i * 0.015 }
                      }
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setHovered((h) => (h === i ? null : i))}
                      aria-label={`${formatShortDay(point.date)}: ${point.count} görev`}
                      className={`group relative w-full max-w-[26px] rounded-t-[6px] transition-[filter,background-color] duration-200 ${
                        isToday
                          ? "shadow-[0_-4px_24px_-4px_var(--glow)]"
                          : "hover:brightness-110"
                      }`}
                      style={{
                        background: isToday
                          ? "linear-gradient(to top, var(--accent), color-mix(in oklab, var(--teal) 75%, var(--accent)))"
                          : "color-mix(in oklab, var(--fg) 15%, transparent)",
                        opacity: loading ? 0.55 : 1,
                      }}
                    >
                      {isToday && (
                        <span className="absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-teal shadow-[0_0_10px_2px_var(--teal)]" />
                      )}
                    </motion.button>

                    <AnimatePresence>
                      {hovered === i && (
                        <motion.div
                          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 3, scale: 0.97 }}
                          transition={{ duration: 0.16 }}
                          className="pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-xl border border-line bg-[var(--glass-strong)] px-2.5 py-1.5 text-center shadow-soft backdrop-blur-xl"
                          style={{ background: "var(--glass-strong)" }}
                        >
                          <span className="block font-mono text-[13px] font-semibold text-fg">
                            {point.count}
                          </span>
                          <span className="block text-[10px] text-faint">
                            {formatShortDay(point.date)}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
        </div>

        <div className="mt-2 flex gap-[3px] sm:gap-1.5">
          {skeleton
            ? Array.from({ length: days }).map((_, i) => (
                <div key={i} className="flex-1" />
              ))
            : data.map((point, i) => {
                const isToday = point.date === today;
                const showLabel = days === 7 || i === 0 || i === data.length - 1 || i % 5 === 0;
                return (
                  <div key={point.date} className="flex flex-1 justify-center">
                    <span
                      className={`block truncate text-center font-mono text-[9px] leading-none sm:text-[10px] ${
                        isToday ? "font-semibold text-accent" : "text-faint"
                      } ${showLabel ? "opacity-100" : "opacity-0"}`}
                    >
                      {days === 7 ? formatShortDay(point.date) : isToday ? "Bugün" : formatShortDay(point.date).split(" ")[1]}
                    </span>
                  </div>
                );
              })}
        </div>

        {!skeleton && total === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="rounded-full border border-line bg-[var(--glass-strong)] px-3 py-1.5 text-[11px] text-muted backdrop-blur-md">
              Henüz kayıt yok — ilk görevini ekle
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
