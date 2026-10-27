"use client";

import NumberFlow from "@number-flow/react";
import { motion, useReducedMotion } from "motion/react";
import { AnalogClock } from "./analog-clock";
import { useNow } from "@/lib/use-now";
import {
  formatTurkishDate,
  getIstanbulTimeParts,
} from "@/lib/date";

export function ClockTab() {
  const now = useNow(1000);
  const reduce = useReducedMotion();
  const date = now ? new Date(now) : null;
  const parts = date ? getIstanbulTimeParts(date) : null;

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
          aria-live="off"
          suppressHydrationWarning
        >
          {parts ? (
            <>
              <NumberFlow
                value={parts.hour}
                format={{ minimumIntegerDigits: 2 }}
                animated={!reduce}
                className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]"
              />
              <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">:</span>
              <NumberFlow
                value={parts.minute}
                format={{ minimumIntegerDigits: 2 }}
                animated={!reduce}
                className="text-[42px] font-semibold leading-none tracking-tight sm:text-[56px]"
              />
              <span className="mx-1 translate-y-[-2px] text-[32px] font-light text-faint sm:text-[42px]">:</span>
              <NumberFlow
                value={parts.second}
                format={{ minimumIntegerDigits: 2 }}
                animated={!reduce}
                className="text-[42px] font-semibold leading-none tracking-tight text-accent sm:text-[56px]"
              />
            </>
          ) : (
            <span className="text-[42px] font-semibold leading-none tracking-tight text-faint/40 sm:text-[56px]">
              --:--:--
            </span>
          )}
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-line-strong via-line to-transparent" />

        <p className="mt-4 text-[15px] font-medium tracking-tight text-fg/90 sm:text-base" suppressHydrationWarning>
          {date ? formatTurkishDate(date) : "\u00a0"}
        </p>

        <p className="mt-1.5 text-[12px] leading-relaxed text-faint">
          Cihazınızın saat diliminden bağımsız olarak her zaman Türkiye saatini gösterir.
        </p>

        <motion.div
          initial={false}
          className="mt-5 inline-flex items-center gap-2 text-[11px] text-muted"
        >
          <span className="rounded-md bg-accent-soft px-2 py-1 font-mono text-accent">UTC+3</span>
          <span>Yıl boyu sabit saat dilimi</span>
        </motion.div>
      </div>

      <div className="order-1 mx-auto w-[178px] shrink-0 sm:w-[204px] md:order-2 md:mx-0">
        <AnalogClock date={date} className="aspect-square w-full drop-shadow-[0_25px_45px_rgba(40,20,110,0.25)]" />
      </div>
    </div>
  );
}
