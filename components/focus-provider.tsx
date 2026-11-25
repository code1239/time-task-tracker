"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Topic } from "@/lib/focus";
import { formatClock } from "@/lib/topic-style";
import { startAlarm, stopAlarm, unlockAudio } from "@/lib/alarm";
import { AlarmBanner } from "./alarm-banner";

export type { Topic };

export type RunningSession = {
  id: number;
  topicId: number;
  title: string | null;
  startedAt: string;
  /** Countdown length in minutes; null = open-ended count-up. */
  plannedMinutes: number | null;
};

/** What the dial shows: time elapsed, or time left for a timed session. */
export function timerView(running: RunningSession | null, elapsedMs: number) {
  if (!running) return { ms: 0, timed: false };
  if (running.plannedMinutes) {
    const left = Math.max(0, running.plannedMinutes * 60_000 - elapsedMs);
    return { ms: Math.ceil(left / 1000) * 1000, timed: true };
  }
  return { ms: elapsedMs, timed: false };
}

/** A countdown that just ran out: it is already saved; the user may mark it done. */
export type FinishedSession = {
  id: number;
  topicId: number;
  title: string | null;
  minutes: number;
};

const ALARM_KEY = "ttt:focus-alarm-dismissed:";

function isDismissed(id: number) {
  try {
    return window.localStorage.getItem(ALARM_KEY + id) === "1";
  } catch {
    return false;
  }
}

function markDismissed(id: number) {
  try {
    window.localStorage.setItem(ALARM_KEY + id, "1");
  } catch {
    // without storage the alarm only stays quiet in this tab
  }
}

export type StopResult = {
  stopped: { id: number; seconds: number; completed: boolean } | null;
  discarded?: boolean;
  count: number | null;
  locked: boolean;
};

type FocusContextValue = {
  topics: Topic[];
  topicsLoaded: boolean;
  setTopics: (topics: Topic[]) => void;
  running: RunningSession | null;
  runningTopic: Topic | null;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  start: (topicId: number, title?: string | null, plannedMinutes?: number | null) => Promise<boolean>;
  stop: (completed: boolean) => Promise<StopResult | null>;
  /** Set when a countdown ends on its own (already saved to the database). */
  finished: FinishedSession | null;
  /** Marks the finished session as a completed task (and bumps the counter). */
  completeFinished: () => Promise<StopResult | null>;
  dismissFinished: () => void;
  /** Changes whenever focus data changes; charts refetch on it. */
  version: number;
  bump: () => void;
};

const FocusContext = createContext<FocusContextValue | null>(null);
// Ticks every second; kept apart so charts don't re-render with the timer.
const ElapsedContext = createContext(0);

async function readError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : fallback;
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [running, setRunning] = useState<RunningSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Server clock minus local clock, so elapsed time is right on a skewed device.
  const [skew, setSkew] = useState(0);
  const [ringing, setRinging] = useState(false);
  const [finished, setFinished] = useState<FinishedSession | null>(null);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const loadCurrent = useCallback(async () => {
    try {
      const res = await fetch("/api/focus/current", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.now === "string") setSkew(Date.parse(data.now) - Date.now());
      setRunning(data.running ?? null);
    } catch {
      // keep the last known state
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/topics", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.topics)) setTopics(data.topics);
        }
      } finally {
        if (!cancelled) setTopicsLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data fetch
    loadCurrent();
    return () => {
      cancelled = true;
    };
  }, [loadCurrent]);

  // Re-sync when the tab comes back (a session may have changed elsewhere).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadCurrent();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadCurrent]);

  // Tick once a second while a session runs and the page is visible.
  useEffect(() => {
    if (!running) return;
    let interval: ReturnType<typeof setInterval> | null = null;
    const tick = () => setNow(Date.now());
    const startTicking = () => {
      tick();
      if (!interval) interval = setInterval(tick, 1000);
    };
    const stopTicking = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? startTicking() : stopTicking());
    startTicking();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopTicking();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);

  const runningTopic = useMemo(
    () => (running ? topics.find((t) => t.id === running.topicId) ?? null : null),
    [running, topics]
  );
  const elapsedMs = running ? Math.max(0, now + skew - Date.parse(running.startedAt)) : 0;

  // Show the live timer in the browser tab title.
  const baseTitle = useRef<string | null>(null);
  useEffect(() => {
    if (baseTitle.current === null) baseTitle.current = document.title;
    const view = timerView(running, elapsedMs);
    document.title = running
      ? `⏱ ${formatClock(view.ms)} · ${runningTopic?.name ?? "Odak"}`
      : baseTitle.current;
  }, [running, runningTopic, elapsedMs]);

  useEffect(() => {
    return () => {
      if (baseTitle.current !== null) document.title = baseTitle.current;
    };
  }, []);

  // Browsers only allow sound after a user gesture: unlock audio on the first one.
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

  // A timed session ends by itself: the server saves exactly the planned time
  // (even with no browser open). Here we ring, refresh and offer "completed?".
  // Opening the page after that moment stays silent.
  useEffect(() => {
    if (!running?.plannedMinutes) return;
    const target = Date.parse(running.startedAt) - skew + running.plannedMinutes * 60_000;
    if (target <= Date.now() || isDismissed(running.id)) return;

    const done: FinishedSession = {
      id: running.id,
      topicId: running.topicId,
      title: running.title,
      minutes: running.plannedMinutes,
    };
    let fired = false;
    const check = () => {
      if (fired || Date.now() < target) return;
      fired = true;
      setFinished(done);
      setRinging(true);
      startAlarm();
      loadCurrent(); // the server has closed the session: running becomes null
      bump();
    };
    const timeout = setTimeout(check, Math.min(target - Date.now() + 50, 2_000_000_000));
    const interval = setInterval(check, 30_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [running, skew, loadCurrent, bump]);

  // Silence the bell when the banner closes.
  useEffect(() => {
    if (!ringing) stopAlarm();
  }, [ringing]);

  // Silenced in another tab: stop here too.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith(ALARM_KEY) && event.newValue === "1") {
        stopAlarm();
        setRinging(false);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      stopAlarm();
    };
  }, []);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    if (finished) markDismissed(finished.id);
    setRinging(false);
  }, [finished]);

  const dismissFinished = useCallback(() => {
    stopAlarm();
    setRinging(false);
    setFinished(null);
  }, []);

  const completeFinished = useCallback(async (): Promise<StopResult | null> => {
    if (!finished) return null;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/focus/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: finished.id }),
      });
      if (!res.ok) {
        setError(await readError(res, "Görev tamamlandı olarak işaretlenemedi"));
        return null;
      }
      const data = await res.json();
      stopAlarm();
      setRinging(false);
      setFinished(null);
      bump();
      return {
        stopped: { id: finished.id, seconds: finished.minutes * 60, completed: Boolean(data.completed) },
        count: data.count ?? null,
        locked: Boolean(data.locked),
      };
    } catch {
      setError("Bağlantı kurulamadı. Tekrar dene.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [finished, bump]);

  const start = useCallback(
    async (topicId: number, title?: string | null, plannedMinutes?: number | null) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/focus/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, title: title || null, plannedMinutes: plannedMinutes ?? null }),
        });
        if (!res.ok) {
          setError(await readError(res, "Zamanlayıcı başlatılamadı"));
          return false;
        }
        const data = await res.json();
        setRunning(data.running ?? null);
        setNow(Date.now());
        setFinished(null);
        bump();
        return true;
      } catch {
        setError("Bağlantı kurulamadı. Tekrar dene.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [bump]
  );

  const stop = useCallback(
    async (completed: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/focus/stop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
        });
        if (!res.ok) {
          setError(await readError(res, "Zamanlayıcı durdurulamadı"));
          return null;
        }
        const data = (await res.json()) as StopResult;
        setRunning(null);
        bump();
        return data;
      } catch {
        setError("Bağlantı kurulamadı. Tekrar dene.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [bump]
  );

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<FocusContextValue>(
    () => ({
      topics,
      topicsLoaded,
      setTopics,
      running,
      runningTopic,
      busy,
      error,
      clearError,
      start,
      stop,
      finished,
      completeFinished,
      dismissFinished,
      version,
      bump,
    }),
    [topics, topicsLoaded, running, runningTopic, busy, error, clearError, start, stop, finished, completeFinished, dismissFinished, version, bump]
  );

  return (
    <FocusContext.Provider value={value}>
      <ElapsedContext.Provider value={elapsedMs}>
        {children}
        <AlarmBanner
          open={ringing}
          title={
            finished
              ? `${topics.find((t) => t.id === finished.topicId)?.emoji ?? "⏱️"} ${finished.title || topics.find((t) => t.id === finished.topicId)?.name || "Odak"} · ${finished.minutes} dk kaydedildi`
              : ""
          }
          onDismiss={dismissAlarm}
        />
      </ElapsedContext.Provider>
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}

/** Live elapsed milliseconds of the running session (0 when idle). */
export function useFocusElapsed() {
  return useContext(ElapsedContext);
}
