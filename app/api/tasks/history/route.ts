import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getIstanbulDateString } from "@/lib/date";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7");
  const limit = days === 30 ? 30 : 7;

  const today = getIstanbulDateString(new Date());
  // Generate date range
  const dates: string[] = [];
  const d = new Date(today + "T00:00:00");
  for (let i = limit - 1; i >= 0; i--) {
    const cur = new Date(d);
    cur.setDate(d.getDate() - i);
    const yyyy = cur.getFullYear();
    const mm = String(cur.getMonth() + 1).padStart(2, "0");
    const dd = String(cur.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  // Build query with LEFT JOIN
  const dateParams: any = {};
  const unions = dates
    .map((dt, idx) => {
      dateParams[`d${idx}`] = dt;
      return `SELECT @d${idx} AS CountDate`;
    })
    .join(" UNION ALL ");

  const sql = `
    WITH DateRange AS (${unions})
    SELECT dr.CountDate, ISNULL(t.Count, 0) AS Count
    FROM DateRange dr
    LEFT JOIN dbo.DailyTaskCounts t ON t.CountDate = dr.CountDate AND t.UserId = @userId
    ORDER BY dr.CountDate
  `;

  const rows = await query<any>(sql, { userId: session.userId, ...dateParams });
  return NextResponse.json({ data: rows, today });
}
