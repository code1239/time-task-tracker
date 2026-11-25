import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { bumpTodayTasks } from "@/lib/focus";
import { badRequest, readJson, serverError } from "@/lib/api";

const schema = z.object({ id: z.number().int().positive() });

/**
 * Marks an already-saved session (for example a countdown that ended on its own)
 * as a completed task. Only counts once per session.
 */
export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await readJson(req, schema);
  if (!body) return badRequest();

  try {
    const rows = await query<{ Id: number | string }>(
      `UPDATE dbo.FocusSessions SET Completed = 1
       OUTPUT inserted.Id
       WHERE Id = @id AND UserId = @userId AND EndedAt IS NOT NULL AND Completed = 0;`,
      { id: body.id, userId: session.userId }
    );
    if (!rows[0]) return NextResponse.json({ completed: false, count: null, locked: false });
    const { count, locked } = await bumpTodayTasks(session.userId);
    return NextResponse.json({ completed: true, count, locked });
  } catch {
    return serverError("Görev tamamlandı olarak işaretlenemedi");
  }
}
