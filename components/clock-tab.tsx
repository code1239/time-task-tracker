"use client";

import { useMemo } from "react";
import { AnalogClock } from "./analog-clock";
import { useNow } from "@/lib/use-now";
import { formatTurkishDate, getIstanbulTimeParts } from "@/lib/date";

const pad = (value: number) => String(value).padStart(2, "0");

export function ClockTab() {
  const now = useNow(1000);
  const date = useMemo(() => (now === null ? null : new Date(now)), [now]);
  const parts = useMemo(() => (date ? getIstanbulTimeParts(date) : null), [date]);
  const dateLabel = useMemo(() => (date ? formatTurkishDate(date) : "\u00a0"), [date]);

  return (
    <div className="grid items-center gap-7 [contain:layout_style_paint] md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
      <div className="order-2 min-w-0 md:order-1">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted">
          <span className="size-1.5 rounded-full bg-teal shadow-[0_0_0_3px_color-mix(in_oklab,var(--teal)_22%,transparent)]" />
          CANLI · EUROPE/ISTANBUL
        </div>

        <div
          className="mt-4 flex items-baseline font-mono tabular-nums text-fg"
          aria-live="off"
          suppressHydrationWarning
        >
          <span className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]">
            {parts ? pad(parts.hour) : "--"}
          </span>
          <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">:</span>
          <span className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]">
            {parts ? pad(parts.minute) : "--"}
          </span>
          <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">:</span>
          <span className="text-[42px] font-semibold leading-none tracking-tight text-accent sm:text-[56px]">
            {parts ? pad(parts.second) : "--"}
          </span>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-line-strong via-line to-transparent" />

        <p
          className="mt-4 text-[15px] font-medium tracking-tight text-fg/90 sm:text-base"
          suppressHydrationWarning
        >
          {dateLabel}
        </p>

        <p className="mt-1.5 text-[12px] leading-relaxed text-faint">
          Cihazınızın saat diliminden bağımsız olarak her zaman Türkiye saatini gösterir.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 text-[11px] text-muted">
          <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-accent">UTC+3</span>
          <span>Yıl boyu sabit saat dilimi</span>
        </div>
      </div>

      <div className="order-1 mx-auto w-[178px] shrink-0 sm:w-[204px] md:order-2 md:mx-0">
        <AnalogClock parts={parts} className="w-full" />
      </div>
    </div>
  );
}
