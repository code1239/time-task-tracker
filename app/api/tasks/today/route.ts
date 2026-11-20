import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";
import { getTodoSnapshot } from "@/lib/notion";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  // With a Notion page selected, the counter follows the page: sync it first.
  const snapshot = await getTodoSnapshot(session.userId).catch(() => null);
  const locked = snapshot?.status === "ok" || snapshot?.status === "error";

  const today = getIstanbulDateString();
  const rows = await query<{ Count: number }>(
    "SELECT Count FROM dbo.DailyTaskCounts WHERE UserId = @userId AND CountDate = @date",
    { userId: session.userId, date: today }
  );

  return NextResponse.json({
    count: rows[0]?.Count ?? 0,
    date: today,
    locked,
    stale: snapshot?.status === "error",
  });
}
