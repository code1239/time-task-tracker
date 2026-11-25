import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { addDaysToDateString, getIstanbulDateString } from "@/lib/date";
import {
  activeDaysSince,
  clipSessionsToDay,
  computeStreak,
  getTaskCounts,
  istanbulDayBounds,
  listTopics,
  minutesByTopic,
  sessionsBetween,
  shareByTopic,
} from "@/lib/focus";
import { serverError } from "@/lib/api";

const STREAK_LOOKBACK_DAYS = 365;

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const days = req.nextUrl.searchParams.get("days") === "30" ? 30 : 7;
  const today = getIstanbulDateString();
  const from = addDaysToDateString(today, -(days - 1));
  const now = new Date();

  try {
    const [topics, sessions, tasks, active] = await Promise.all([
      listTopics(session.userId, { includeArchived: true }),
      sessionsBetween(session.userId, istanbulDayBounds(from).start, istanbulDayBounds(today).end),
      getTaskCounts(session.userId, from, today),
      activeDaysSince(session.userId, addDaysToDateString(today, -STREAK_LOOKBACK_DAYS), now),
    ]);

    const allSegments = [];
    const series = [];
    for (let i = 0; i < days; i++) {
      const date = addDaysToDateString(from, i);
      const segments = clipSessionsToDay(sessions, date, now);
      allSegments.push(...segments);
      const byTopic: Record<string, number> = {};
      let total = 0;
      for (const [id, minutes] of minutesByTopic(segments)) {
        byTopic[id] = Math.round(minutes * 10) / 10;
        total += minutes;
      }
      series.push({ date, total: Math.round(total * 10) / 10, byTopic, tasks: tasks.get(date) ?? 0 });
    }

    const shares = shareByTopic(minutesByTopic(allSegments), topics);
    const totalMinutes = series.reduce((sum, d) => sum + d.total, 0);

    return NextResponse.json({
      days,
      from,
      today,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      totalTasks: series.reduce((sum, d) => sum + d.tasks, 0),
      streak: computeStreak(active, today),
      topics: shares,
      series,
    });
  } catch {
    return serverError("İstatistikler yüklenemedi");
  }
}
