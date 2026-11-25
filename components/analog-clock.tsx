"use client";

import { useState } from "react";
import { ClockFace } from "./clock-face";
import { getIstanbulTimeParts } from "@/lib/date";

// Hand lengths as a share of the dial box (the face is drawn on a 240-unit grid).
const HOUR_LENGTH = "19%";
const MINUTE_LENGTH = "30%";
const SECOND_LENGTH = "36%";

// Istanbul is a fixed UTC+3, so its clock is epoch seconds shifted by 3 hours.
const OFFSET_SECONDS = 3 * 3600;

type HandProps = {
  angle: number;
  length: string;
  width: number;
  className: string;
  durationMs: number;
  easing?: string;
  tail?: boolean;
};

function Hand({ angle, length, width, className, durationMs, easing, tail = false }: HandProps) {
  return (
    <div
      aria-hidden="true"
      data-tail={tail ? "true" : undefined}
      className={`clock-hand ${className}`}
      style={{
        height: length,
        width,
        marginLeft: -width / 2,
        transform: `rotate(${angle}deg)`,
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: easing,
      }}
    />
  );
}

type Props = {
  /** Current time in epoch milliseconds, or null before the first tick. */
  now: number | null;
  className?: string;
};

export function AnalogClock({ now, className = "" }: Props) {
  // Angles grow forever and are never wrapped at 360 degrees: a wrapped angle
  // (354 -> 0) would make the CSS transition spin the hand backwards across the
  // whole dial once a minute. They are counted from the 12-hour boundary before
  // the first tick (which keeps all three hands aligned) so the numbers stay
  // small; raw epoch angles (about 1e10 degrees) lose precision in the browser.
  const seconds = now === null ? null : Math.floor(now / 1000) + OFFSET_SECONDS;
  const [origin, setOrigin] = useState<{ base: number; first: number } | null>(null);
  if (seconds !== null && origin === null) setOrigin({ base: Math.floor(seconds / 43_200) * 43_200, first: seconds });
  const elapsed = seconds === null || origin === null ? 0 : seconds - origin.base;
  const secondAngle = elapsed * 6;
  const minuteAngle = elapsed * 0.1;
  const hourAngle = elapsed / 120;

  // Skip the transition on the very first tick so the hands snap into place
  // instead of sweeping across the dial.
  const ready = seconds !== null && origin !== null && seconds !== origin.first;
  let label = "Analog saat";
  if (now !== null) {
    const parts = getIstanbulTimeParts(new Date(now));
    label = `Saat ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  }

  return (
    <div role="img" aria-label={label} className={`relative aspect-square ${className}`}>
      <div aria-hidden="true" className="clay absolute inset-0 rounded-full" />

      <ClockFace />

      <Hand
        angle={hourAngle}
        length={HOUR_LENGTH}
        width={7}
        className="bg-fg"
        durationMs={ready ? 700 : 0}
      />
      <Hand
        angle={minuteAngle}
        length={MINUTE_LENGTH}
        width={5}
        className="bg-fg/85"
        durationMs={ready ? 450 : 0}
      />
      {/* a quartz-style "tick": the second hand springs slightly past each mark */}
      <Hand
        angle={secondAngle}
        length={SECOND_LENGTH}
        width={2.5}
        className="bg-accent"
        durationMs={ready ? 260 : 0}
        easing="cubic-bezier(0.3, 1.9, 0.5, 1)"
        tail
      />

      <span
        aria-hidden="true"
        className="clay-sm absolute left-1/2 top-1/2 size-[8%] -translate-x-1/2 -translate-y-1/2 rounded-full"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[3.4%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      />
    </div>
  );
}
