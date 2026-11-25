import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { bumpTodayTasks, settleExpiredSessions } from "@/lib/focus";
import { badRequest, readJson, serverError } from "@/lib/api";

const schema = z.object({ completed: z.boolean().optional() });

/** Sessions shorter than this are treated as a mis-click and dropped. */
const MIN_SECONDS = 5;

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await readJson(req, schema);
  if (!body) return badRequest();
  const completed = Boolean(body.completed);

  try {
    await settleExpiredSessions(session.userId);
    const rows = await query<{ Id: number | string; Seconds: number }>(
      `UPDATE dbo.FocusSessions
         SET EndedAt = SYSUTCDATETIME(), Completed = @completed
       OUTPUT inserted.Id, DATEDIFF(SECOND, inserted.StartedAt, inserted.EndedAt) AS Seconds
       WHERE UserId = @userId AND EndedAt IS NULL;`,
      { userId: session.userId, completed }
    );
    const stopped = rows[0];
    if (!stopped) return NextResponse.json({ stopped: null, count: null, locked: false });

    if (stopped.Seconds < MIN_SECONDS && !completed) {
      await query("DELETE FROM dbo.FocusSessions WHERE Id = @id AND UserId = @userId", {
        id: stopped.Id,
        userId: session.userId,
      });
      return NextResponse.json({ stopped: null, discarded: true, count: null, locked: false });
    }

    // A completed task bumps the counter, unless a Notion page drives it.
    const { count, locked } = completed ? await bumpTodayTasks(session.userId) : { count: null, locked: false };

    return NextResponse.json({
      stopped: { id: Number(stopped.Id), seconds: stopped.Seconds, completed },
      count,
      locked,
    });
  } catch {
    return serverError("Zamanlayıcı durdurulamadı");
  }
}
