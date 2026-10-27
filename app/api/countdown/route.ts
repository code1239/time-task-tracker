import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query, execute } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  title: z.string().max(100).nullable().optional(),
  targetAt: z.string().datetime(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const rows = await query<any>(
    "SELECT Title, TargetAt, UpdatedAt FROM dbo.Countdowns WHERE UserId = @userId",
    { userId: session.userId }
  );

  if (rows.length === 0) return NextResponse.json({ countdown: null });

  const row = rows[0];
  return NextResponse.json({
    countdown: {
      title: row.Title,
      targetAt: new Date(row.TargetAt).toISOString(),
      updatedAt: new Date(row.UpdatedAt).toISOString(),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz tarih veya başlık" }, { status: 400 });
    }

    const { title, targetAt } = parsed.data;
    const targetDate = new Date(targetAt);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    }

    await execute(
      `MERGE dbo.Countdowns AS target
       USING (SELECT @userId AS UserId) AS source
       ON target.UserId = source.UserId
       WHEN MATCHED THEN
         UPDATE SET Title = @title, TargetAt = @targetAt, UpdatedAt = SYSUTCDATETIME()
       WHEN NOT MATCHED THEN
         INSERT (UserId, Title, TargetAt, UpdatedAt) VALUES (@userId, @title, @targetAt, SYSUTCDATETIME());`,
      { userId: session.userId, title: title || null, targetAt: targetDate }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  await execute("DELETE FROM dbo.Countdowns WHERE UserId = @userId", { userId: session.userId });
  return NextResponse.json({ ok: true });
}
