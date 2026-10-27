"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { formatTurkishDate, getIstanbulDateString } from "@/lib/date";
import { TaskHistoryChart, type HistoryPoint } from "./task-history-chart";
import { MinusIcon, PlusIcon, SparkleIcon } from "./icons";

export function TasksTab() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState<number | null>(null);
  const countRef = useRef<number | null>(null);
  const [date, setDate] = useState(getIstanbulDateString());
  const dateRef = useRef(date);
  const [days, setDays] = useState<7 | 30>(7);
  const daysRef = useRef<7 | 30>(7);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const inflight = useRef(0);
  const seq = useRef(0);
  const plusRef = useRef<HTMLButtonElement>(null);

  const loadToday = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/today", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (typeof data.count === "number") {
        setCount(data.count);
        countRef.current = data.count;
      }
      if (typeof data.date === "string") {
        setDate(data.date);
        dateRef.current = data.date;
      }
    } catch {
      setError("Görev sayısı yüklenemedi. Sayfayı yenilemeyi deneyin.");
    }
  }, []);

  const loadHistory = useCallback(async (range: 7 | 30) => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/tasks/history?days=${range}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (Array.isArray(data.data)) setHistory(data.data);
    } catch {
      setError("Geçmiş verileri yüklenemedi.");
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data fetch
    loadToday();
  }, [loadToday]);

  useEffect(() => {
    daysRef.current = days;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- range change refetches remote data
    loadHistory(days);
  }, [days, loadHistory]);

  const checkDay = useCallback(() => {
    const today = getIstanbulDateString();
    if (today !== dateRef.current) {
      dateRef.current = today;
      setDate(today);
      setMilestone("Yeni gün başladı · sayaç sıfırlandı");
      loadToday();
      loadHistory(daysRef.current);
    }
  }, [loadToday, loadHistory]);

  useEffect(() => {
    const interval = setInterval(checkDay, 15000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkDay();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkDay]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    if (!milestone) return;
    const t = setTimeout(() => setMilestone(null), 2600);
    return () => clearTimeout(t);
  }, [milestone]);

  async function celebrate() {
    if (reduce || typeof window === "undefined") return;
    const rect = plusRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        }
      : { x: 0.5, y: 0.5 };
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 36,
        spread: 62,
        startVelocity: 26,
        gravity: 0.95,
        decay: 0.92,
        scalar: 0.75,
        ticks: 110,
        origin,
        colors: ["#7c5cff", "#39e0cf", "#ff9b79", "#ffffff"],
        disableForReducedMotion: true,
      });
    } catch {
      // decoration only
    }
  }

  function change(delta: number) {
    const current = countRef.current;
    if (current === null) return;
    const next = Math.max(0, current + delta);
    if (next === current) return;

    setCount(next);
    countRef.current = next;
    setError(null);

    if (delta > 0 && next > 0 && next % 5 === 0) {
      setMilestone(next % 10 === 0 ? `${next} görev · mükemmel!` : `${next} görev · harika gidiyorsun`);
      celebrate();
    }

    seq.current += 1;
    const mySeq = seq.current;
    inflight.current += 1;

    (async () => {
      try {
        const res = await fetch("/api/tasks/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta }),
        });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (mySeq === seq.current && typeof data.count === "number") {
          setCount(data.count);
          countRef.current = data.count;
        }
      } catch {
        setError("Değişiklik kaydedilemedi. Tekrar deneniyor…");
      } finally {
        inflight.current -= 1;
        if (inflight.current === 0) {
          try {
            const res = await fetch("/api/tasks/today", { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (typeof data.count === "number") {
                setCount(data.count);
                countRef.current = data.count;
              }
            }
          } catch {
            // keep optimistic value
          }
        }
      }
    })();
  }

  const displayHistory = history.map((point) =>
    point.date === date && count !== null ? { ...point, count } : point
  );

  const isAtZero = count === 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium text-muted">
          <span className="size-1.5 rounded-full bg-accent shadow-[0_0_8px_2px_var(--glow)]" />
          BUGÜN · {formatTurkishDate(new Date()).toLocaleUpperCase("tr-TR")}
        </div>
        <span className="hidden text-[11px] text-faint sm:inline">00:00&apos;da sıfırlanır</span>
      </div>

      <div className="relative mt-5 flex items-center justify-center gap-5 sm:gap-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,var(--glow),transparent_65%)] opacity-50 blur-2xl" />

        <motion.button
          type="button"
          onClick={() => change(-1)}
          disabled={count === null || isAtZero}
          aria-label="Görev sayısını bir azalt"
          whileHover={reduce || isAtZero ? undefined : { scale: 1.06, y: -1 }}
          whileTap={reduce || isAtZero ? undefined : { scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="grid size-12 shrink-0 place-items-center rounded-full border border-line bg-surface/60 text-fg shadow-soft backdrop-blur-md transition-colors hover:border-line-strong hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-surface/60 sm:size-14"
        >
          <MinusIcon className="size-5" />
        </motion.button>

        <div className="min-w-[124px] text-center sm:min-w-[168px]">
          {count === null ? (
            <div className="mx-auto h-[64px] w-24 animate-pulse rounded-2xl bg-fg/10 sm:h-[78px] sm:w-32" />
          ) : (
            <NumberFlow
              value={count}
              animated={!reduce}
              format={{ useGrouping: false }}
              className="font-mono text-[64px] font-semibold leading-none tracking-[-0.04em] text-fg sm:text-[80px]"
              aria-label={`Bugünkü görev sayısı: ${count}`}
            />
          )}
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-faint">
            görev
          </p>
        </div>

        <motion.button
          ref={plusRef}
          type="button"
          onClick={() => change(1)}
          disabled={count === null}
          aria-label="Görev sayısını bir artır"
          whileHover={reduce ? undefined : { scale: 1.06, y: -1 }}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 26 }}
          className="accent-gradient relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full text-white shadow-glow transition-[filter] duration-200 hover:brightness-110 sm:size-14"
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
          <PlusIcon className="relative size-5" />
          <AnimatePresence>
            {milestone && (
              <motion.span
                key={milestone}
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute inset-0 rounded-full border border-white/60"
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="mt-3 grid h-6 place-items-center">
        <AnimatePresence mode="wait">
          {milestone ? (
            <motion.p
              key={milestone}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent"
            >
              <SparkleIcon className="size-3.5" />
              {milestone}
            </motion.p>
          ) : (
            <p className="text-[12px] text-faint">Her tıklama anında kaydedilir.</p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="mt-2 overflow-hidden rounded-xl border border-coral/25 bg-coral/10 px-3 py-2 text-center text-[12px] text-coral"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-line-strong to-transparent" />

      <TaskHistoryChart
        data={displayHistory}
        days={days}
        onDaysChange={setDays}
        today={date}
        loading={chartLoading}
      />
    </div>
  );
}
