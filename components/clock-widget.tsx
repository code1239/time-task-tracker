"use client";

import { useMemo } from "react";
import { AnalogClock } from "./analog-clock";
import { MaximizeIcon, MinimizeIcon } from "./icons";
import { useFullscreen } from "@/lib/use-fullscreen";
import { useNow } from "@/lib/use-now";
import { formatTurkishDate, getIstanbulTimeParts } from "@/lib/date";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Istanbul clock with a fullscreen mode. Its ancestors must not use `transform`
 * (it would trap the fixed fullscreen fallback), so no entrance animations here.
 */
export function ClockWidget() {
  const now = useNow(1000);
  const date = useMemo(() => (now === null ? null : new Date(now)), [now]);
  const parts = useMemo(() => (date ? getIstanbulTimeParts(date) : null), [date]);
  const dateLabel = useMemo(() => (date ? formatTurkishDate(date) : " "), [date]);
  const { ref, isFullscreen, isFallback, toggle } = useFullscreen<HTMLDivElement>();

  const Icon = isFullscreen ? MinimizeIcon : MaximizeIcon;
  const toggleLabel = isFullscreen ? "Tam ekrandan çık" : "Tam ekran";

  return (
    <div
      ref={ref}
      data-fullscreen={isFullscreen ? "true" : undefined}
      data-fallback={isFallback ? "true" : undefined}
      className="clock-stage xl:flex xl:h-full xl:flex-col"
    >
      <div className="clock-stage__body grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_auto] xl:min-h-0 xl:flex-1">
        <div className="clock-stage__text order-2 min-w-0 sm:order-1" style={{ containerType: "inline-size" }}>
          <div className="clock-live clay-pressed inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold text-muted">
            <span className="size-2 rounded-full bg-teal" aria-hidden="true" />
            Türkiye saati
          </div>

          <div
            className="clock-time tabular mt-3 flex items-baseline text-fg"
            style={{ fontSize: "clamp(24px, 19cqw, 64px)" }}
            aria-live="off"
            suppressHydrationWarning
          >
            <span className="clock-hour text-[1em] font-semibold leading-none">{parts ? pad(parts.hour) : "--"}</span>
            <span className="clock-colon mx-[0.08em] text-[0.75em] font-medium text-faint">:</span>
            <span className="clock-minute text-[1em] font-semibold leading-none">
              {parts ? pad(parts.minute) : "--"}
            </span>
            <span className="clock-colon mx-[0.08em] text-[0.75em] font-medium text-faint">:</span>
            <span className="clock-second text-[1em] font-semibold leading-none text-accent">
              {parts ? pad(parts.second) : "--"}
            </span>
          </div>

          <div className="clock-divider mt-3 h-px w-full bg-gradient-to-r from-line-strong via-line to-transparent" />

          <p className="clock-date mt-3 text-[15px] font-bold text-fg/90" suppressHydrationWarning>
            {dateLabel}
          </p>
          <p className="clock-note mt-1 text-[13px] font-semibold leading-relaxed text-faint xl:hidden 2xl:block">
            Cihazının saat diliminden bağımsız, her zaman Türkiye saati (UTC+3).
          </p>
        </div>

        <div className="clock-stage__clock order-1 mx-auto w-[240px] shrink-0 sm:order-2 sm:mx-0 sm:w-[280px] xl:aspect-square xl:h-full xl:max-h-full xl:w-auto">
          <AnalogClock now={now} className="w-full xl:h-full xl:w-auto" />
        </div>
      </div>

      <div className="clock-stage__actions mt-3 flex shrink-0">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={isFullscreen}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="clay-sm inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-muted transition-colors hover:text-fg"
        >
          <Icon className="size-4" />
          {toggleLabel}
        </button>
      </div>
    </div>
  );
}
