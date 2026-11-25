import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { badRequest, readJson, serverError } from "@/lib/api";

const schema = z.object({
  topicId: z.number().int().positive(),
  minutes: z.number().int().min(1).max(720),
  endedAt: z.string().datetime().optional(),
  title: z.string().trim().max(200).nullable().optional(),
});

/** Logs time that was spent without the timer running. */
export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await readJson(req, schema);
  if (!body) return badRequest("Konu ve 1–720 dakika arası süre gir");

  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date();
  if (endedAt.getTime() > Date.now() + 60_000) return badRequest("Bitiş zamanı gelecekte olamaz");
  const startedAt = new Date(endedAt.getTime() - body.minutes * 60_000);

  try {
    const rows = await query<{ Id: number | string }>(
      `INSERT INTO dbo.FocusSessions (UserId, TopicId, Title, StartedAt, EndedAt, Source)
       OUTPUT inserted.Id
       SELECT @userId, Id, @title, @startedAt, @endedAt, 'manual'
       FROM dbo.Topics WHERE Id = @topicId AND UserId = @userId AND ArchivedAt IS NULL;`,
      { userId: session.userId, topicId: body.topicId, title: body.title || null, startedAt, endedAt }
    );
    if (!rows[0]) return badRequest("Konu bulunamadı");
    return NextResponse.json({ id: Number(rows[0].Id) });
  } catch {
    return serverError("Süre eklenemedi");
  }
}
