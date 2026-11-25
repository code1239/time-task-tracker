import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getRunningSession, serializeSession, settleExpiredSessions } from "@/lib/focus";
import { badRequest, isUniqueViolation, readJson, serverError } from "@/lib/api";

const schema = z.object({
  topicId: z.number().int().positive(),
  title: z.string().trim().max(200).nullable().optional(),
  /** Countdown length in minutes; omit for an open-ended count-up session. */
  plannedMinutes: z.number().int().min(1).max(24 * 60).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await readJson(req, schema);
  if (!body) return badRequest("Bir konu seç");

  try {
    await settleExpiredSessions(session.userId);
    // Stop any running session and start the new one atomically.
    const rows = await query<{ Id: number }>(
      `SET XACT_ABORT ON;
       BEGIN TRAN;
       IF NOT EXISTS (SELECT 1 FROM dbo.Topics WHERE Id = @topicId AND UserId = @userId AND ArchivedAt IS NULL)
       BEGIN
         ROLLBACK;
         SELECT CAST(0 AS INT) AS Id;
         RETURN;
       END
       UPDATE dbo.FocusSessions SET EndedAt = SYSUTCDATETIME()
         WHERE UserId = @userId AND EndedAt IS NULL;
       INSERT INTO dbo.FocusSessions (UserId, TopicId, Title, StartedAt, Source, PlannedMinutes)
         VALUES (@userId, @topicId, @title, SYSUTCDATETIME(), 'timer', @plannedMinutes);
       COMMIT;
       SELECT CAST(1 AS INT) AS Id;`,
      {
        userId: session.userId,
        topicId: body.topicId,
        title: body.title || null,
        plannedMinutes: body.plannedMinutes ?? null,
      }
    );
    if (!rows[0]?.Id) return badRequest("Konu bulunamadı");
    const running = await getRunningSession(session.userId);
    return NextResponse.json({ running: running ? serializeSession(running) : null });
  } catch (e) {
    if (isUniqueViolation(e)) return badRequest("Zaten çalışan bir zamanlayıcı var");
    return serverError("Zamanlayıcı başlatılamadı");
  }
}
