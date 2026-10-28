"use client";

import { memo } from "react";

const TICKS = Array.from({ length: 60 }, (_, i) => i);

const NUMERALS = [
  { value: "12", x: 120, y: 43 },
  { value: "3", x: 197, y: 125 },
  { value: "6", x: 120, y: 204 },
  { value: "9", x: 43, y: 125 },
];

/**
 * The static dial: gradient, ticks and numerals. It never receives props, so it
 * renders exactly once and is never reconciled again by the parent clock.
 */
export const ClockFace = memo(function ClockFace() {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      focusable="false"
      className="absolute inset-0 size-full"
    >
      <defs>
        <radialGradient id="clock-dial" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="var(--glass-strong)" />
          <stop offset="100%" stopColor="var(--glass)" />
        </radialGradient>
      </defs>

      <circle
        cx="120"
        cy="120"
        r="112"
        fill="url(#clock-dial)"
        stroke="var(--line-strong)"
        strokeWidth="1"
      />
      <circle cx="120" cy="120" r="103" fill="none" stroke="var(--line)" strokeWidth="1" />

      {TICKS.map((i) => {
        const major = i % 5 === 0;
        return (
          <line
            key={i}
            x1="120"
            y1={major ? 20 : 23}
            x2="120"
            y2={major ? 32 : 29}
            stroke={major ? "var(--fg)" : "var(--muted)"}
            strokeOpacity={major ? 0.7 : 0.35}
            strokeWidth={major ? 1.6 : 1}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 120 120)`}
          />
        );
      })}

      {NUMERALS.map((n) => (
        <text
          key={n.value}
          x={n.x}
          y={n.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--muted)"
          fontSize="11"
          fontWeight="600"
          fontFamily="var(--font-geist-mono)"
          letterSpacing="0.5"
        >
          {n.value}
        </text>
      ))}
    </svg>
  );
});
