"use client";

import { useEffect, useMemo, useRef } from "react";
import { getIstanbulTimeParts } from "@/lib/date";

type Props = {
  className?: string;
};

export function AnalogClock({ className = "" }: Props) {
  const hourRef = useRef<SVGGElement>(null);
  const minuteRef = useRef<SVGGElement>(null);
  const secondRef = useRef<SVGGElement>(null);

  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  const numerals = useMemo(
    () => [
      { value: "12", x: 120, y: 43 },
      { value: "3", x: 197, y: 125 },
      { value: "6", x: 120, y: 204 },
      { value: "9", x: 43, y: 125 },
    ],
    []
  );

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = new Date();
      const p = getIstanbulTimeParts(now);
      const hourAngle = ((p.hour % 12) + p.minute / 60 + p.second / 3600) * 30;
      const minuteAngle = (p.minute + p.second / 60) * 6;
      const secondAngle = p.second * 6;

      const hEl = hourRef.current;
      const mEl = minuteRef.current;
      const sEl = secondRef.current;

      if (hEl) hEl.style.transform = `rotate(${hourAngle}deg)`;
      if (mEl) mEl.style.transform = `rotate(${minuteAngle}deg)`;
      if (sEl) sEl.style.transform = `rotate(${secondAngle}deg)`;

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        aria-hidden="true"
        className="absolute inset-6 rounded-full bg-accent/20 blur-2xl"
      />
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label="Analog saat"
        className="relative size-full"
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

        <g
          ref={hourRef}
          style={{
            transformOrigin: "120px 120px",
            transformBox: "view-box",
          }}
        >
          <line
            x1="120"
            y1="130"
            x2="120"
            y2="76"
            stroke="var(--fg)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
        </g>

        <g
          ref={minuteRef}
          style={{
            transformOrigin: "120px 120px",
            transformBox: "view-box",
          }}
        >
          <line
            x1="120"
            y1="132"
            x2="120"
            y2="52"
            stroke="var(--fg)"
            strokeOpacity="0.82"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
        </g>

        <g
          ref={secondRef}
          style={{
            transformOrigin: "120px 120px",
            transformBox: "view-box",
          }}
        >
          <line
            x1="120"
            y1="136"
            x2="120"
            y2="42"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="120" cy="42" r="2.8" fill="var(--accent)" />
        </g>

        <circle
          cx="120"
          cy="120"
          r="7"
          fill="var(--glass-strong)"
          stroke="var(--line-strong)"
          strokeWidth="1"
        />
        <circle cx="120" cy="120" r="2.6" fill="var(--accent)" />
      </svg>
    </div>
  );
}

