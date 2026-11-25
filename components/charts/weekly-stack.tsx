"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RangeStats } from "@/lib/use-stats";
import { formatShortDay } from "@/lib/date";
import { formatMinutes, slotColor, slotStyle } from "@/lib/topic-style";

type Row = { date: string; total: number; [topicId: string]: number | string };

function StackTooltip({
  active,
  payload,
  topics,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
  topics: RangeStats["topics"];
}) {
  const row = active ? payload?.[0]?.payload : null;
  if (!row) return null;
  const present = topics.filter((t) => Number(row[String(t.id)]) > 0);
  return (
    <div className="clay-sm min-w-[150px] rounded-2xl px-3 py-2 text-[13px]">
      <p className="font-bold">{formatShortDay(row.date)}</p>
      {present.length === 0 && <p className="font-semibold text-muted">Odak yok</p>}
      {present.map((t) => (
        <p key={t.id} className="flex items-center gap-2 font-semibold text-muted">
          <span className="size-2.5 rounded-full" style={{ background: slotColor(t.slot) }} aria-hidden="true" />
          <span className="flex-1">{t.name}</span>
          <span className="tabular text-fg">{formatMinutes(Number(row[String(t.id)]))}</span>
        </p>
      ))}
      {present.length > 1 && (
        <p className="mt-1 flex justify-between border-t border-line pt-1 font-bold">
          <span>Toplam</span>
          <span className="tabular">{formatMinutes(row.total)}</span>
        </p>
      )}
    </div>
  );
}

/** Stacked daily focus minutes per topic. Fills the box it is given. */
export function WeeklyStack({ data }: { data: RangeStats }) {
  // stack in slot order so a topic always sits at the same height
  const topics = [...data.topics].sort((a, b) => a.slot - b.slot);
  const rows: Row[] = data.series.map((d) => ({ date: d.date, total: d.total, ...d.byTopic }));
  const max = Math.max(60, ...rows.map((r) => r.total));
  const unit = max >= 120 ? 60 : 30;
  const top = Math.ceil(max / unit) * unit;
  const ticks = Array.from({ length: top / unit + 1 }, (_, i) => i * unit);

  return (
    <div className="flex h-full min-h-[260px] flex-col xl:min-h-0">
      <div
        className="min-h-[150px] flex-1"
        role="img"
        aria-label={`Son ${data.days} günün konu bazlı odak süreleri`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={data.days === 7 ? 0 : 4}
              tickFormatter={(d: string) => (data.days === 7 ? formatShortDay(d).split(" ")[0] : d.slice(8))}
              tick={{ fill: "var(--faint)", fontSize: 11, fontWeight: 700 }}
            />
            <YAxis
              width={44}
              domain={[0, top]}
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => (v === 0 ? "0" : v % 60 === 0 ? `${v / 60} sa` : `${v} dk`)}
              tick={{ fill: "var(--faint)", fontSize: 11, fontWeight: 700 }}
            />
            <Tooltip cursor={{ fill: "var(--chart-track)" }} content={<StackTooltip topics={topics} />} />
            {topics.map((t) => (
              <Bar
                key={t.id}
                dataKey={String(t.id)}
                stackId="focus"
                fill={slotColor(t.slot)}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {topics.length > 0 && (
        <ul className="mt-2 flex shrink-0 flex-wrap gap-x-4 gap-y-1">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-[12px] font-bold text-muted">
              <span className="slot-swatch size-3 rounded-full" style={slotStyle(t.slot)} aria-hidden="true" />
              {t.emoji} {t.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
