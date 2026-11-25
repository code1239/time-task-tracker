"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { TopicShare } from "@/lib/focus";
import { formatMinutes, slotColor, slotStyle } from "@/lib/topic-style";

type Props = {
  topics: TopicShare[];
  totalMinutes: number;
  /** Text in the middle, e.g. "bugün". */
  centerLabel: string;
};

function ShareTooltip({ active, payload }: { active?: boolean; payload?: { payload: TopicShare }[] }) {
  const t = active ? payload?.[0]?.payload : null;
  if (!t) return null;
  return (
    <div className="clay-sm rounded-2xl px-3 py-2 text-[13px]">
      <p className="font-bold">
        {t.emoji} {t.name}
      </p>
      <p className="font-semibold text-muted">
        %{t.pct} · {formatMinutes(t.minutes)}
      </p>
    </div>
  );
}

/** "Where did the day go?" share-of-time donut with an always-on legend and a table view. */
export function TopicDonut({ topics, totalMinutes, centerLabel }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <div className="flex h-full min-h-[260px] flex-col xl:min-h-0">
      <div className="clay-pressed mb-2 ml-auto flex w-fit shrink-0 rounded-full p-1" role="group" aria-label="Görünüm">
        {(["chart", "table"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-full px-3 py-1 text-[12px] font-bold ${view === v ? "clay-sm text-fg" : "text-muted"}`}
          >
            {v === "chart" ? "Grafik" : "Tablo"}
          </button>
        ))}
      </div>

      {view === "chart" ? (
        <>
          <div className="relative min-h-[130px] flex-1" style={{ containerType: "size" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart role="img" aria-label="Konu payları">
                <Pie
                  data={topics}
                  dataKey="minutes"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="96%"
                  startAngle={90}
                  endAngle={-270}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {topics.map((t) => (
                    <Cell key={t.id} fill={slotColor(t.slot)} />
                  ))}
                </Pie>
                <Tooltip content={<ShareTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className="tabular font-semibold leading-none" style={{ fontSize: "clamp(16px, 11cqmin, 44px)" }}>
                  {formatMinutes(totalMinutes)}
                </p>
                <p className="mt-1 font-bold text-muted" style={{ fontSize: "clamp(11px, 5cqmin, 16px)" }}>
                  {centerLabel}
                </p>
              </div>
            </div>
          </div>

          <ul className="mt-3 grid max-h-[28%] shrink-0 gap-1 overflow-y-auto xl:max-h-[34%]">
            {topics.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-[13px]">
                <span
                  className="slot-swatch size-3 shrink-0 rounded-full"
                  style={slotStyle(t.slot)}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate font-bold">
                  {t.emoji} {t.name}
                </span>
                <span className="tabular font-semibold text-muted">{formatMinutes(t.minutes)}</span>
                <span className="tabular w-10 text-right font-semibold">%{t.pct}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Konu payları</caption>
            <thead>
              <tr className="text-faint">
                <th className="pb-2 font-bold">Konu</th>
                <th className="pb-2 text-right font-bold">Süre</th>
                <th className="pb-2 text-right font-bold">Pay</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="py-2 font-bold">
                    {t.emoji} {t.name}
                  </td>
                  <td className="tabular py-2 text-right">{formatMinutes(t.minutes)}</td>
                  <td className="tabular py-2 text-right">%{t.pct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
