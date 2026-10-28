"use client";

import { useRef } from "react";
import { AnalogClock } from "./analog-clock";
import { useIstanbulTime } from "@/lib/use-istanbul-time";

export function ClockTab() {
  const hourRef = useRef<HTMLSpanElement>(null);
  const minuteRef = useRef<HTMLSpanElement>(null);
  const secondRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);
  useIstanbulTime({ hourEl: hourRef, minuteEl: minuteRef, secondEl: secondRef, dateEl: dateRef });

  return (
    <div className="grid items-center gap-7 md:grid-cols-[minmax(0,1fr)_auto] md:gap-8">
      <div className="order-2 min-w-0 md:order-1">
        <div className="inline-flex items-center gap-2 rounded-full glass-inset px-3 py-1.5 text-[11px] font-medium tracking-wide text-muted">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-teal" />
          </span>
          CANLI · EUROPE/ISTANBUL
        </div>

        <div
          className="mt-4 flex items-baseline font-mono text-fg"
          aria-live="polite"
          suppressHydrationWarning
        >
          <span
            ref={hourRef}
            className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]"
          >
            --
          </span>
          <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">
            :
          </span>
          <span
            ref={minuteRef}
            className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]"
          >
            --
          </span>
          <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">
            :
          </span>
          <span
            ref={secondRef}
            className="text-[42px] font-semibold leading-none tracking-tight text-accent sm:text-[56px]"
          >
            --
          </span>
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-line-strong via-line to-transparent" />

        <p
          ref={dateRef}
          className="mt-4 text-[15px] font-medium tracking-tight text-fg/90 sm:text-base"
          suppressHydrationWarning
        >
          &nbsp;
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
        <AnalogClock className="aspect-square w-full drop-shadow-[0_25px_45px_rgba(40,20,110,0.25)]" />
      </div>
    </div>
  );
}

