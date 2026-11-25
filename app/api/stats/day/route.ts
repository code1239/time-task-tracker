import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getIstanbulDateString } from "@/lib/date";
import {
  clipSessionsToDay,
  getTaskCounts,
  isDateString,
  istanbulDayBounds,
  listTopics,
  minutesByTopic,
  sessionsBetween,
  shareByTopic,
} from "@/lib/focus";
import { getTodoSnapshot } from "@/lib/notion";
import { serverError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const today = getIstanbulDateString();
  const param = req.nextUrl.searchParams.get("date");
  const date = isDateString(param) && param <= today ? param : today;
  const now = new Date();

  try {
    // With a Notion page selected, today's task count follows the page.
    if (date === today) await getTodoSnapshot(session.userId).catch(() => null);

    const { start, end } = istanbulDayBounds(date);
    const [topics, sessions, tasks] = await Promise.all([
      listTopics(session.userId, { includeArchived: true }),
      sessionsBetween(session.userId, start, end),
      getTaskCounts(session.userId, date, date),
    ]);
    const segments = clipSessionsToDay(sessions, date, now);
    const shares = shareByTopic(minutesByTopic(segments), topics);
    const totalMinutes = segments.reduce((sum, s) => sum + s.minutes, 0);

    return NextResponse.json({
      date,
      today,
      now: now.toISOString(),
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      tasks: tasks.get(date) ?? 0,
      topics: shares,
      segments,
    });
  } catch {
    return serverError("Günlük özet yüklenemedi");
  }
}
