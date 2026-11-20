import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const today = getIstanbulDateString();
  const rows = await query<{ Count: number }>(
    "SELECT Count FROM dbo.DailyTaskCounts WHERE UserId = @userId AND CountDate = @date",
    { userId: session.userId, date: today }
  );

  return NextResponse.json({ count: rows[0]?.Count ?? 0, date: today });
}
