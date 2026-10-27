import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const today = getIstanbulDateString(new Date());
  const rows = await query<{ Count: number }>(
    "SELECT Count FROM dbo.DailyTaskCounts WHERE UserId = @userId AND CountDate = @date",
    { userId: session.userId, date: today }
  );

  return NextResponse.json({ count: rows.length > 0 ? rows[0].Count : 0, date: today });
}
