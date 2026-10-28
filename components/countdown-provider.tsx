"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { formatIstanbulDateTime } from "@/lib/date";
import { BellIcon, StopIcon } from "./icons";

export type Countdown = { title: string | null; targetAt: string };

type CountdownContextValue = {
  countdown: Countdown | null;
  loading: boolean;
  loadError: string | null;
  updateCountdown: (next: Countdown | null) => void;
  replayAlarm: () => void;
};

const CountdownContext = createContext<CountdownContextValue | null>(null);

const DISMISS_KEY = "ttt:alarm-dismissed:";
const SAFETY_INTERVAL_MS = 30_000;

function isDismissed(targetAt: string) {
  try {
    return window.localStorage.getItem(DISMISS_KEY + targetAt) === "1";
  } catch {
    return false;
  }
}

function markDismissed(targetAt: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY + targetAt, "1");
  } catch {
    // Depolama kapalıysa alarm yalnızca bu oturumda susar.
  }
}

function clearDismissed(targetAt: string) {
  try {
    window.localStorage.removeItem(DISMISS_KEY + targetAt);
  } catch {
    // yoksay
  }
}

export function CountdownProvider({ children }: { children: ReactNode }) {
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ringTarget, setRingTarget] = useState<string | null>(null);

  // İlk veri: sayfa açılışında bir kez.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/countdown", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setCountdown(data.countdown ?? null);
      } catch {
        if (!cancelled) setLoadError("Geri sayım yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // İlk kullanıcı etkileşiminde ses kilidini aç (tarayıcı autoplay politikası).
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Süre dolduğunda çal. Sekme arka planda veya uykudayken de yakalanır.
  useEffect(() => {
    if (!countdown) return;
    const target = Date.parse(countdown.targetAt);
    if (!Number.isFinite(target)) return;
    // Sayfa açıldığında süre çoktan dolmuşsa sessiz kalır.
    if (target <= Date.now()) return;
    if (isDismissed(countdown.targetAt)) return;

    let fired = false;
    const check = () => {
      if (fired || Date.now() < target) return;
      fired = true;
      setRingTarget(countdown.targetAt);
      startAlarm();
    };

    const timeout = setTimeout(check, Math.min(target - Date.now() + 50, 2_000_000_000));
    const interval = setInterval(check, SAFETY_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [countdown]);

  // Başka sekmede susmaya basıldıysa buradaki ses de dursun.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith(DISMISS_KEY)) return;
      if (event.newValue !== "1") return;
      stopAlarm();
      setRingTarget(null);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      stopAlarm();
    };
  }, []);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    setRingTarget((current) => {
      if (current) markDismissed(current);
      return null;
    });
  }, []);

  const updateCountdown = useCallback((next: Countdown | null) => {
    stopAlarm();
    setRingTarget(null);
    setCountdown(next);
  }, []);

  const replayAlarm = useCallback(() => {
    if (!countdown) return;
    unlockAudio();
    clearDismissed(countdown.targetAt);
    setRingTarget(countdown.targetAt);
    startAlarm();
  }, [countdown]);

  const value = useMemo<CountdownContextValue>(
    () => ({ countdown, loading, loadError, updateCountdown, replayAlarm }),
    [countdown, loading, loadError, updateCountdown, replayAlarm]
  );

  return (
    <CountdownContext.Provider value={value}>
      {children}
      <AlarmBanner targetAt={ringTarget} onDismiss={dismissAlarm} />
    </CountdownContext.Provider>
  );
}

function AlarmBanner({
  targetAt,
  onDismiss,
}: {
  targetAt: string | null;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {targetAt && (
        <motion.div
          key="alarm"
          role="alert"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed inset-x-3 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-accent/30 bg-surface/95 p-3 shadow-glow backdrop-blur-xl sm:bottom-6"
        >
          <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent">
            <span className="absolute inset-0 animate-breathe rounded-xl bg-accent/20 blur-md" />
            <BellIcon className="relative size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tracking-tight text-fg">Süre doldu</p>
            <p className="truncate text-[11px] text-muted">{formatIstanbulDateTime(new Date(targetAt))}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 text-[12px] font-medium text-white shadow-glow transition-[filter] hover:brightness-110"
          >
            <StopIcon className="size-3.5" />
            Sesi durdur
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useCountdown() {
  const ctx = useContext(CountdownContext);
  if (!ctx) throw new Error("useCountdown must be used within CountdownProvider");
  return ctx;
}
