"use client";

import { useCallback, useEffect, useState } from "react";
import type { Segment, TopicShare } from "./focus";

export type DayStats = {
  date: string;
  today: string;
  now: string;
  totalMinutes: number;
  tasks: number;
  topics: TopicShare[];
  segments: Segment[];
};

export type RangeStats = {
  days: 7 | 30;
  from: string;
  today: string;
  totalMinutes: number;
  totalTasks: number;
  streak: number;
  topics: TopicShare[];
  series: { date: string; total: number; byTopic: Record<string, number>; tasks: number }[];
};

type State<T> = { data: T | null; loading: boolean; error: string | null; reload: () => void };

function useFetched<T>(url: string | null, version: number, errorText: string): State<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (url === null) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- remote data fetch
    setLoading(true);
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        return (await res.json()) as T;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(errorText);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, version, nonce, errorText]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, loading, error, reload };
}

/** Today's (or another day's) focus summary; refetches when `version` changes. */
export const useDayStats = (version: number, date?: string) =>
  useFetched<DayStats>(`/api/stats/day${date ? `?date=${date}` : ""}`, version, "Günlük özet yüklenemedi.");

/** Pass `enabled = false` to skip the request (for ranges another hook already covers). */
export const useRangeStats = (version: number, days: 7 | 30, enabled = true) =>
  useFetched<RangeStats>(enabled ? `/api/stats/range?days=${days}` : null, version, "Haftalık özet yüklenemedi.");
