"use client";

import { ClockFace } from "./clock-face";
// Hand lengths as a share of the dial box, matching the original 240-unit viewBox.
const HOUR_LENGTH = "18.3%";
const MINUTE_LENGTH = "28.3%";
const SECOND_LENGTH = "32.5%";

type HandProps = {
  angle: number;
  length: string;
  width: number;
  className: string;
  durationMs: number;
  tail?: boolean;
};

function Hand({ angle, length, width, className, durationMs, tail = false }: HandProps) {
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
      }}
    />
  );
}

type Props = {
  parts: { hour: number; minute: number; second: number } | null;
  className?: string;
};

export function AnalogClock({ parts, className = "" }: Props) {
  const hourAngle = parts
    ? ((parts.hour % 12) + parts.minute / 60 + parts.second / 3600) * 30
    : 0;
  const minuteAngle = parts ? (parts.minute + parts.second / 60) * 6 : 0;
  const secondAngle = parts ? parts.second * 6 : 0;

  // Skip the transition on the very first paint so the hands snap into place
  // instead of sweeping across the whole dial.
  const ready = parts !== null;
  const label = parts
    ? `Saat ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
    : "Analog saat";

  return (
    <div role="img" aria-label={label} className={`relative aspect-square ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full bg-[var(--glass-strong)] shadow-[0_18px_40px_-18px_rgba(40,20,110,0.35)] dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
      />

      <ClockFace />

      <Hand
        angle={hourAngle}
        length={HOUR_LENGTH}
        width={5}
        className="bg-[var(--fg)]"
        durationMs={ready ? 700 : 0}
      />
      <Hand
        angle={minuteAngle}
        length={MINUTE_LENGTH}
        width={3}
        className="bg-fg/80"
        durationMs={ready ? 450 : 0}
      />
      <Hand
        angle={secondAngle}
        length={SECOND_LENGTH}
        width={2}
        className="bg-accent"
        durationMs={ready ? 180 : 0}
        tail
      />

      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[5.8%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-line-strong bg-[var(--glass-strong)]"
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[2.2%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
      />
    </div>
  );
}
