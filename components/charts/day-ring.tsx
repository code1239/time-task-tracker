"use client";

import { useMemo, useState } from "react";
import type { DayStats } from "@/lib/use-stats";
import { formatIstanbul } from "@/lib/date";
import { formatMinutes, slotColor } from "@/lib/topic-style";

const C = 120;
const R = 92;
const W = 24;

/** Minutes since Istanbul midnight for an instant (Istanbul is fixed UTC+3). */
function minutesIntoDay(iso: string, date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const dayStart = Date.UTC(y, m - 1, d) - 3 * 3_600_000;
  return (Date.parse(iso) - dayStart) / 60_000;
}

const point = (minutes: number, r: number) => {
  const a = (minutes / 1440) * 2 * Math.PI - Math.PI / 2; // midnight at the top
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
};

function arc(from: number, to: number) {
  const [x1, y1] = point(from, R);
  const [x2, y2] = point(to, R);
  const large = to - from > 720 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** 24-hour ring of the day. Scales to whatever box it is given. */
export function DayRing({ data }: { data: DayStats }) {
  const [active, setActive] = useState<number | null>(null);

  const topicById = useMemo(() => new Map(data.topics.map((t) => [t.id, t])), [data.topics]);
  const arcs = useMemo(
    () =>
      data.segments.map((s, i) => {
        const from = Math.max(0, minutesIntoDay(s.start, data.date));
        // keep very short sessions visible (about 3 degrees)
        const to = Math.min(1440, Math.max(minutesIntoDay(s.end, data.date), from + 8));
        return { i, s, from, to, topic: topicById.get(s.topicId) };
      }),
    [data.segments, data.date, topicById]
  );

  const isToday = data.date === data.today;
  const nowMinutes = isToday ? minutesIntoDay(data.now, data.date) : null;
  const dayShare = (data.totalMinutes / 1440) * 100;
  const shareLabel =
    dayShare === 0 ? "0" : dayShare < 10 ? dayShare.toFixed(1).replace(".", ",") : String(Math.round(dayShare));

  const hover = active !== null ? arcs[active] : null;
  const summary = data.segments.length
    ? `Gün halkası: bugün ${formatMinutes(data.totalMinutes)} odak, günün yüzde ${shareLabel} kadarı.`
    : "Gün halkası: bugün henüz odak oturumu yok.";

  return (
    // size container: the ring and its centre text scale with the smaller side
    <div className="relative h-full min-h-[220px] w-full xl:min-h-[150px]" style={{ containerType: "size" }}>
      <svg viewBox="0 0 240 240" role="img" aria-label={summary} className="absolute inset-0 size-full">
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--chart-track)" strokeWidth={W} />

        {[0, 6, 12, 18].map((h) => {
          const [x, y] = point(h * 60, R + W / 2 + 9);
          return (
            <text
              key={h}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontWeight="700"
              fill="var(--faint)"
            >
              {String(h).padStart(2, "0")}
            </text>
          );
        })}

        {arcs.map(({ i, s, from, to, topic }) => (
          <path
            key={`${s.id}-${s.start}`}
            d={arc(from, to)}
            fill="none"
            stroke={slotColor(topic?.slot ?? 1)}
            strokeWidth={active === i ? W + 4 : W}
            strokeLinecap="butt"
            tabIndex={0}
            role="img"
            aria-label={`${topic?.name ?? "Konu"}, ${formatIstanbul(new Date(s.start), "HH:mm")} ile ${formatIstanbul(new Date(s.end), "HH:mm")} arası, ${formatMinutes(s.minutes)}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            style={{ cursor: "pointer", transition: "stroke-width 120ms ease" }}
          />
        ))}

        {nowMinutes !== null && nowMinutes >= 0 && nowMinutes <= 1440 && (
          <line
            aria-hidden="true"
            x1={point(nowMinutes, R - W / 2 - 4)[0]}
            y1={point(nowMinutes, R - W / 2 - 4)[1]}
            x2={point(nowMinutes, R + W / 2 + 4)[0]}
            y2={point(nowMinutes, R + W / 2 + 4)[1]}
            stroke="var(--fg)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="flex w-[56cqmin] flex-col items-center text-center">
          {hover ? (
            <>
              <span className="leading-none" style={{ fontSize: "clamp(18px, 9cqmin, 40px)" }} aria-hidden="true">
                {hover.topic?.emoji ?? "•"}
              </span>
              <span
                className="mt-1 max-w-full truncate font-bold"
                style={{ fontSize: "clamp(12px, 5.2cqmin, 20px)" }}
              >
                {hover.topic?.name ?? "Konu"}
              </span>
              <span className="font-semibold text-muted" style={{ fontSize: "clamp(11px, 4.4cqmin, 16px)" }}>
                {formatIstanbul(new Date(hover.s.start), "HH:mm")}–{formatIstanbul(new Date(hover.s.end), "HH:mm")}
              </span>
              <span className="tabular font-semibold text-accent" style={{ fontSize: "clamp(13px, 6cqmin, 22px)" }}>
                {formatMinutes(hover.s.minutes)}
              </span>
            </>
          ) : (
            <>
              <span
                className="tabular font-semibold leading-none"
                style={{ fontSize: "clamp(22px, 14cqmin, 64px)" }}
              >
                %{shareLabel}
              </span>
              <span
                className="mt-1 font-bold leading-tight text-muted"
                style={{ fontSize: "clamp(10px, 4.2cqmin, 16px)" }}
              >
                {isToday ? "günün odakta geçti" : "o günün odakta geçti"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
