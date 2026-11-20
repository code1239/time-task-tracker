import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";
import { isCounterLocked } from "@/lib/notion";
import { z } from "zod";

const schema = z.object({
  delta: z.number().int(),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  // The counter is driven by the user's Notion page while one is selected.
  if (await isCounterLocked(session.userId).catch(() => false)) {
    return NextResponse.json({ error: "Sayaç Notion'a bağlı" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  try {
    // Atomic upsert; OUTPUT returns the new value in the same round-trip.
    const rows = await query<{ Count: number }>(
      `MERGE dbo.DailyTaskCounts AS target
       USING (SELECT @userId AS UserId, @date AS CountDate) AS source
       ON target.UserId = source.UserId AND target.CountDate = source.CountDate
       WHEN MATCHED THEN
         UPDATE SET Count = CASE WHEN target.Count + @delta < 0 THEN 0 ELSE target.Count + @delta END
       WHEN NOT MATCHED THEN
         INSERT (UserId, CountDate, Count) VALUES (@userId, @date, CASE WHEN @delta < 0 THEN 0 ELSE @delta END)
       OUTPUT inserted.Count;`,
      { userId: session.userId, date: getIstanbulDateString(), delta: parsed.data.delta }
    );

    return NextResponse.json({ count: rows[0]?.Count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
