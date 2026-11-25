"use client";

import { useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { ClockWidget } from "./clock-widget";
import { ChartCard } from "./chart-card";
import { DayRing } from "./charts/day-ring";
import { TopicDonut } from "./charts/topic-donut";
import { WeeklyStack } from "./charts/weekly-stack";
import { TopicLeaderboard } from "./charts/topic-leaderboard";
import { TaskHistoryChart, type HistoryPoint } from "./task-history-chart";
import { useFocus } from "./focus-provider";
import { useDayStats, useRangeStats } from "@/lib/use-stats";
import { getIstanbulTimeParts } from "@/lib/date";
import type { TabId } from "@/lib/tabs";

function greeting() {
  const hour = getIstanbulTimeParts(new Date()).hour;
  if (hour < 5) return "İyi geceler";
  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}

function Empty({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid h-full min-h-[160px] place-items-center rounded-[20px] bg-sunk px-4 py-6 text-center">
      <div className="grid justify-items-center gap-2">
        <span className="text-[34px]" aria-hidden="true">
          🌱
        </span>
        <p className="max-w-[26ch] text-[13px] font-semibold text-muted">Henüz odak kaydı yok.</p>
        <button type="button" onClick={onStart} className="clay-button rounded-full px-4 py-2 text-[13px] font-bold">
          İlk odağını başlat
        </button>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="clay-pressed h-full min-h-[160px] animate-pulse rounded-[20px]" />;
}

function Stat({ emoji, label, children }: { emoji: string; label: string; children: ReactNode }) {
  return (
    <div className="clay-sm flex min-w-0 flex-col justify-between rounded-[20px] p-3.5">
      <p className="flex items-start gap-1.5 text-[12px] font-bold text-muted">
        <span aria-hidden="true">{emoji}</span>
        <span className="leading-tight">{label}</span>
      </p>
      <div className="mt-1 text-[26px] font-semibold leading-none">{children}</div>
    </div>
  );
}

function RangeSwitch({ days, onChange }: { days: 7 | 30; onChange: (d: 7 | 30) => void }) {
  return (
    <div className="clay-pressed flex rounded-full p-1" role="group" aria-label="Grafik aralığı">
      {([7, 30] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={days === value}
          className={`rounded-full px-3 py-1 text-[12px] font-bold ${days === value ? "clay-sm text-fg" : "text-muted"}`}
        >
          {value} gün
        </button>
      ))}
    </div>
  );
}

/** On xl screens every box fits in one screen without scrolling; below that they stack. */
export function DashboardPage({ username, onNavigate }: { username: string; onNavigate: (tab: TabId) => void }) {
  const { version } = useFocus();
  const day = useDayStats(version);
  const [days, setDays] = useState<7 | 30>(7);
  const week = useRangeStats(version, 7);
  // the 7-day request also feeds the charts; only 30 days needs its own
  const wide = useRangeStats(version, 30, days === 30);
  const range = days === 7 ? week : wide;

  const d = day.data;
  const hours = d ? Math.floor(d.totalMinutes / 60) : 0;
  const mins = d ? Math.round(d.totalMinutes % 60) : 0;
  const top = d?.topics[0];
  const hasToday = Boolean(d && d.segments.length > 0);
  const hasWeek = Boolean(week.data && week.data.totalMinutes > 0);

  const history: HistoryPoint[] = (range.data?.series ?? []).map((s) => ({ date: s.date, count: s.tasks }));
  const goFocus = () => onNavigate("focus");

  return (
    <div className="flex flex-col gap-4 xl:h-full xl:min-h-[680px]">
      {day.error && (
        <p role="alert" className="rounded-2xl bg-coral/10 px-4 py-3 text-[14px] font-bold text-coral">
          {day.error}{" "}
          <button type="button" onClick={day.reload} className="underline underline-offset-2">
            Yeniden dene
          </button>
        </p>
      )}

      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:grid-rows-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="clay flex min-h-0 flex-col p-4 sm:p-5 xl:col-span-5" aria-label="Karşılama ve saat">
          <h1 className="shrink-0 font-display text-[22px] font-semibold leading-tight sm:text-[26px]">
            {greeting()}, {username}! <span aria-hidden="true">👋</span>
          </h1>
          <div className="mt-3 min-h-0 flex-1">
            <ClockWidget />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 xl:col-span-3 xl:min-h-0 xl:grid-rows-2" aria-label="Bugünün özeti">
          <Stat emoji="⏱️" label="Bugünkü odak">
            {d ? (
              <span className="tabular">
                {hours > 0 && (
                  <>
                    <NumberFlow value={hours} /> <span className="text-[14px] text-muted">sa</span>{" "}
                  </>
                )}
                <NumberFlow value={mins} /> <span className="text-[14px] text-muted">dk</span>
              </span>
            ) : (
              <span className="text-faint">–</span>
            )}
          </Stat>
          <Stat emoji="✅" label="Tamamlanan görev">
            <span className="tabular">{d ? <NumberFlow value={d.tasks} /> : "–"}</span>
          </Stat>
          <Stat emoji="🔥" label="Seri">
            <span className="tabular">
              {week.data ? <NumberFlow value={week.data.streak} /> : "–"}{" "}
              <span className="text-[14px] text-muted">gün</span>
            </span>
          </Stat>
          <Stat emoji="🏆" label="Bugün en çok">
            {top ? (
              <span className="block truncate text-[18px]">
                {top.emoji} {top.name}
              </span>
            ) : (
              <span className="text-[18px] text-faint">–</span>
            )}
          </Stat>
        </div>

        <ChartCard title="Bu haftanın konuları" hint="Son 7 günün payı" className="xl:col-span-4">
          {(expanded) =>
            !week.data ? (
              <Skeleton />
            ) : hasWeek ? (
              <TopicLeaderboard topics={week.data.topics} limit={expanded ? 20 : 4} />
            ) : (
              <Empty onStart={goFocus} />
            )
          }
        </ChartCard>

        <ChartCard title="Günün halkası" hint="24 saatin hangi dilimi hangi konuya gitti" className="xl:col-span-3">
          {() => (!d ? <Skeleton /> : hasToday ? <DayRing data={d} /> : <Empty onStart={goFocus} />)}
        </ChartCard>

        <ChartCard title="Bugün nereye gitti?" hint="Konulara göre pay" className="xl:col-span-3">
          {() =>
            !d ? (
              <Skeleton />
            ) : hasToday ? (
              <TopicDonut topics={d.topics} totalMinutes={d.totalMinutes} centerLabel="bugün" />
            ) : (
              <Empty onStart={goFocus} />
            )
          }
        </ChartCard>

        <ChartCard
          title="Günlük odak süresi"
          hint="Konulara göre yığılmış"
          toolbar={<RangeSwitch days={days} onChange={setDays} />}
          className="xl:col-span-3"
        >
          {() =>
            !range.data ? (
              <Skeleton />
            ) : range.data.totalMinutes > 0 ? (
              <WeeklyStack data={range.data} />
            ) : (
              <Empty onStart={goFocus} />
            )
          }
        </ChartCard>

        <ChartCard
          title="Görev geçmişi"
          hint={range.data ? `Son ${days} gün · ${range.data.totalTasks} görev` : undefined}
          className="xl:col-span-3"
        >
          {() => (
            <TaskHistoryChart data={history} days={days} today={range.data?.today ?? ""} loading={range.loading} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
