import type { TopicShare } from "@/lib/focus";
import { formatMinutes, slotColor } from "@/lib/topic-style";

/** Ranked horizontal bars: share of the period per topic. */
export function TopicLeaderboard({ topics, limit = 5 }: { topics: TopicShare[]; limit?: number }) {
  const max = Math.max(1, ...topics.map((t) => t.minutes));
  return (
    <ol className="flex h-full flex-col gap-3 overflow-y-auto">
      {topics.slice(0, limit).map((t, i) => (
        <li key={t.id} className="shrink-0">
          <div className="flex items-center gap-2 text-[14px]">
            <span className="w-5 shrink-0 text-center" aria-hidden="true">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : t.emoji}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold">
              {t.emoji} {t.name}
            </span>
            <span className="tabular text-[13px] font-semibold text-muted">{formatMinutes(t.minutes)}</span>
            <span className="tabular w-11 text-right font-semibold">%{t.pct}</span>
          </div>
          <div className="clay-pressed mt-1.5 h-3 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, (t.minutes / max) * 100)}%`,
                background: slotColor(t.slot),
                boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.4), inset 0 -2px 3px rgba(0,0,0,0.15)",
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
