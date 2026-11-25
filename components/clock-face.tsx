"use client";

import { memo } from "react";

const MINUTE_DOTS = Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 5 !== 0);
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Point on a circle around (120, 120); 0 degrees is straight up. */
const at = (deg: number, r: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: 120 + r * Math.cos(a), y: 120 + r * Math.sin(a) };
};

/**
 * The static dial: a soft inner well, minute dots, bold hour pills and all twelve
 * numerals. It never receives props, so it renders once and is never reconciled
 * again by the parent clock.
 */
export const ClockFace = memo(function ClockFace() {
  return (
    <svg viewBox="0 0 240 240" aria-hidden="true" focusable="false" className="absolute inset-0 size-full">
      <defs>
        <radialGradient id="clock-well" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="var(--card)" />
          <stop offset="100%" stopColor="var(--card-sunk)" />
        </radialGradient>
      </defs>

      {/* pressed-in face */}
      <circle cx="120" cy="120" r="108" fill="url(#clock-well)" stroke="var(--line)" strokeWidth="1" />

      {MINUTE_DOTS.map((i) => {
        const p = at(i * 6, 98);
        return <circle key={i} cx={p.x} cy={p.y} r="1.3" fill="var(--faint)" opacity="0.75" />;
      })}

      {HOURS.map((h) => {
        const quarter = h % 3 === 0;
        const a = at(h * 30, 98);
        const b = at(h * 30, quarter ? 87 : 90);
        return (
          <line
            key={h}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={quarter ? "var(--accent)" : "var(--muted)"}
            strokeWidth={quarter ? 4 : 3}
            strokeLinecap="round"
          />
        );
      })}

      {HOURS.map((h) => {
        const p = at(h * 30, 70);
        return (
          <text
            key={h}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--fg)"
            fontSize={h % 3 === 0 ? 19 : 15}
            fontWeight={h % 3 === 0 ? 700 : 600}
            fontFamily="var(--font-display-face)"
          >
            {h}
          </text>
        );
      })}
    </svg>
  );
});
