"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { getIstanbulDateString } from "@/lib/date";
import { celebrateFrom } from "@/lib/celebrate";
import { useFocus } from "./focus-provider";
import { MinusIcon, PlusIcon, SparkleIcon } from "./icons";

/** Today's "Yapılan Görev" counter. Locked while a Notion page drives it. */
export function TaskCounter() {
  const reduce = useReducedMotion();
  const { version } = useFocus();
  const [count, setCount] = useState<number | null>(null);
  const countRef = useRef<number | null>(null);
  const [date, setDate] = useState(getIstanbulDateString());
  const dateRef = useRef(date);
  const [error, setError] = useState<string | null>(null);
  const [milestone, setMilestone] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const inflight = useRef(0);
  const seq = useRef(0);
  const plusRef = useRef<HTMLButtonElement>(null);

  const loadToday = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const res = await fetch("/api/tasks/today", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (typeof data.count === "number") {
        setCount(data.count);
        countRef.current = data.count;
      }
      if (typeof data.locked === "boolean") setLocked(data.locked);
      if (typeof data.date === "string") {
        setDate(data.date);
        dateRef.current = data.date;
      }
    } catch {
      if (!silent) setError("Görev sayısı yüklenemedi. Sayfayı yenilemeyi dene.");
    }
  }, []);

  // Initial load, and again whenever a focus session finishes (it may add a task).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote data fetch
    loadToday({ silent: true });
  }, [loadToday, version]);

  // New Istanbul day: reset the counter.
  useEffect(() => {
    const check = () => {
      const today = getIstanbulDateString();
      if (today !== dateRef.current) {
        dateRef.current = today;
        setDate(today);
        setMilestone("Yeni gün başladı · sayaç sıfırlandı");
        loadToday();
      }
    };
    const interval = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, [loadToday]);

  // While Notion drives the counter, pick up ticks made in Notion.
  useEffect(() => {
    if (!locked) return;
    const refresh = () => {
      if (document.visibilityState === "visible") loadToday({ silent: true });
    };
    const interval = setInterval(refresh, 8_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [locked, loadToday]);

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

  function change(delta: number) {
    const current = countRef.current;
    if (current === null || locked) return;
    const next = Math.max(0, current + delta);
    if (next === current) return;

    setCount(next);
    countRef.current = next;
    setError(null);

    if (delta > 0 && next % 5 === 0) {
      setMilestone(next % 10 === 0 ? `${next} görev · mükemmel!` : `${next} görev · harika gidiyorsun`);
      celebrateFrom(plusRef.current);
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
        setError("Değişiklik kaydedilemedi. Sayı sunucuyla yeniden eşleniyor.");
      } finally {
        inflight.current -= 1;
        if (inflight.current === 0) loadToday({ silent: true });
      }
    })();
  }

  const atZero = count === 0;

  return (
    <section className="clay shrink-0 p-4 sm:p-5" aria-label="Yapılan görev sayacı">
      <h2 className="text-[16px] font-semibold">Yapılan görev</h2>
      <p className="mt-0.5 text-[13px] font-semibold text-faint">Bugün · 00:00&apos;da sıfırlanır</p>

      <div className="mt-2 flex items-center justify-center gap-5">
        <motion.button
          type="button"
          onClick={() => change(-1)}
          disabled={count === null || atZero || locked}
          aria-label="Görev sayısını bir azalt"
          whileTap={reduce ? undefined : { scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 24 }}
          className="clay-sm grid size-12 place-items-center rounded-full text-fg disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MinusIcon className="size-5" />
        </motion.button>

        <div className="min-w-[96px] text-center">
          {count === null ? (
            <div className="clay-pressed mx-auto h-[56px] w-20 animate-pulse rounded-2xl" />
          ) : (
            <NumberFlow
              value={count}
              animated={!reduce}
              format={{ useGrouping: false }}
              className="tabular text-[52px] font-semibold leading-none text-fg"
              aria-label={`Bugünkü görev sayısı: ${count}`}
            />
          )}
        </div>

        <motion.button
          ref={plusRef}
          type="button"
          onClick={() => change(1)}
          disabled={count === null || locked}
          aria-label="Görev sayısını bir artır"
          whileTap={reduce ? undefined : { scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 24 }}
          className="clay-button grid size-12 place-items-center rounded-full"
        >
          <PlusIcon className="size-5" />
        </motion.button>
      </div>

      <div className="mt-2 grid min-h-6 place-items-center text-center" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          {milestone ? (
            <motion.p
              key={milestone}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-accent"
            >
              <SparkleIcon className="size-3.5" />
              {milestone}
            </motion.p>
          ) : (
            <p className="text-[13px] font-semibold text-faint">
              {locked
                ? "Sayı, Notion sayfanda bugün tiklediğin görevlerden geliyor."
                : "Odak oturumunu “tamamlandı” diye bitirirsen sayaç da artar."}
            </p>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p role="alert" className="mt-2 rounded-2xl bg-coral/10 px-3 py-2 text-center text-[13px] font-semibold text-coral">
          {error}
        </p>
      )}
    </section>
  );
}
