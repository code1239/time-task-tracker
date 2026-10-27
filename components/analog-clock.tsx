"use client";

import { useMemo } from "react";
import { useReducedMotion } from "motion/react";
import { getIstanbulTimeParts } from "@/lib/date";

type Props = {
  date: Date | null;
  className?: string;
};

export function AnalogClock({ date, className = "" }: Props) {
  const reduce = useReducedMotion();

  // The second hand runs as a continuous CSS animation. Capturing the offset once
  // keeps it perfectly smooth instead of ticking once per second.
  const secondDelay = useMemo(() => {
    const now = new Date();
    return -((now.getSeconds() + now.getMilliseconds() / 1000) % 60);
  }, []);

  const parts = date ? getIstanbulTimeParts(date) : null;
  const hourAngle = parts
    ? ((parts.hour % 12) + parts.minute / 60 + parts.second / 3600) * 30
    : 300;
  const minuteAngle = parts ? (parts.minute + parts.second / 60) * 6 : 60;
  const secondAngle = parts ? (parts.second + new Date(date!.getTime()).getMilliseconds() / 1000) * 6 : 0;

  const ticks = Array.from({ length: 60 }, (_, i) => i);
  const numerals = [
    { value: "12", x: 120, y: 43 },
    { value: "3", x: 197, y: 125 },
    { value: "6", x: 120, y: 204 },
    { value: "9", x: 43, y: 125 },
  ];

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-6 rounded-full bg-accent/20 blur-2xl"
      />
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label={parts ? `Saat ${parts.hour}:${String(parts.minute).padStart(2, "0")}` : "Saat"}
        className="relative size-full"
      >
        <defs>
          <radialGradient id="clock-dial" cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="var(--glass-strong)" />
            <stop offset="100%" stopColor="var(--glass)" />
          </radialGradient>
          <filter id="clock-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="var(--fg)" floodOpacity="0.28" />
          </filter>
          <filter id="second-glow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx="120" cy="120" r="112" fill="url(#clock-dial)" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx="120" cy="120" r="103" fill="none" stroke="var(--line)" strokeWidth="1" />

        {ticks.map((i) => {
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

        {numerals.map((n) => (
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

        {/* hour hand */}
        <g
          style={{
            transform: `rotate(${hourAngle}deg)`,
            transformOrigin: "120px 120px",
            transformBox: "view-box",
            transition: reduce ? "none" : "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          filter="url(#clock-shadow)"
        >
          <line x1="120" y1="130" x2="120" y2="76" stroke="var(--fg)" strokeWidth="5.5" strokeLinecap="round" />
        </g>

        {/* minute hand */}
        <g
          style={{
            transform: `rotate(${minuteAngle}deg)`,
            transformOrigin: "120px 120px",
            transformBox: "view-box",
            transition: reduce ? "none" : "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          filter="url(#clock-shadow)"
        >
          <line x1="120" y1="132" x2="120" y2="52" stroke="var(--fg)" strokeOpacity="0.82" strokeWidth="3.4" strokeLinecap="round" />
        </g>

        {/* second hand */}
        {date && (
          <g
            className={reduce ? undefined : "clock-second"}
            style={
              reduce
                ? {
                    transform: `rotate(${secondAngle}deg)`,
                    transformOrigin: "120px 120px",
                    transformBox: "view-box",
                  }
                : { animationDelay: `${secondDelay}s` }
            }
          >
            <line x1="120" y1="136" x2="120" y2="42" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="120" cy="42" r="3.2" fill="var(--accent)" filter="url(#second-glow)" />
          </g>
        )}

        <circle cx="120" cy="120" r="7" fill="var(--glass-strong)" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx="120" cy="120" r="3.2" fill="var(--accent)" />
      </svg>
    </div>
  );
}
