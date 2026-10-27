import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";
import { z } from "zod";

const schema = z.object({
  delta: z.number().int(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const today = getIstanbulDateString(new Date());
    const delta = parsed.data.delta;

    // Atomic update using MERGE
    await execute(
      `MERGE dbo.DailyTaskCounts AS target
       USING (SELECT @userId AS UserId, @date AS CountDate) AS source
       ON target.UserId = source.UserId AND target.CountDate = source.CountDate
       WHEN MATCHED THEN
         UPDATE SET Count = CASE WHEN target.Count + @delta < 0 THEN 0 ELSE target.Count + @delta END
       WHEN NOT MATCHED THEN
         INSERT (UserId, CountDate, Count) VALUES (@userId, @date, CASE WHEN @delta < 0 THEN 0 ELSE @delta END);`,
      { userId: session.userId, date: today, delta }
    );

    // Fetch updated count
    const { query } = await import("@/lib/db");
    const rows = await query<{ Count: number }>(
      "SELECT Count FROM dbo.DailyTaskCounts WHERE UserId = @userId AND CountDate = @date",
      { userId: session.userId, date: today }
    );

    return NextResponse.json({ count: rows.length > 0 ? rows[0].Count : 0 });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
