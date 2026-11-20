import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { addDaysToDateString, getIstanbulDateString } from "@/lib/date";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const days = req.nextUrl.searchParams.get("days") === "30" ? 30 : 7;
  const today = getIstanbulDateString();
  const from = addDaysToDateString(today, -(days - 1));

  const rows = await query<{ CountDate: Date | string; Count: number }>(
    `SELECT CountDate, Count FROM dbo.DailyTaskCounts
     WHERE UserId = @userId AND CountDate BETWEEN @from AND @today`,
    { userId: session.userId, from, today }
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    const key =
      row.CountDate instanceof Date
        ? row.CountDate.toISOString().slice(0, 10)
        : String(row.CountDate).slice(0, 10);
    counts.set(key, row.Count);
  }

  const data = Array.from({ length: days }, (_, i) => {
    const date = addDaysToDateString(from, i);
    return { date, count: counts.get(date) ?? 0 };
  });

  return NextResponse.json({ data, today });
}
