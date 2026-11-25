import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { listTopics } from "@/lib/focus";
import { badRequest, isUniqueViolation, notFound, parseId, readJson, serverError } from "@/lib/api";

const schema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    emoji: z.string().trim().min(1).max(16).optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((v) => v.name !== undefined || v.emoji !== undefined || v.sortOrder !== undefined);

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const id = parseId((await ctx.params).id);
  if (id === null) return notFound();

  const body = await readJson(req, schema);
  if (!body) return badRequest("Geçersiz konu bilgisi");

  try {
    const result = await execute(
      `UPDATE dbo.Topics SET
         Name = COALESCE(@name, Name),
         Emoji = COALESCE(@emoji, Emoji),
         SortOrder = COALESCE(@sortOrder, SortOrder)
       WHERE Id = @id AND UserId = @userId`,
      {
        id,
        userId: session.userId,
        name: body.name ?? null,
        emoji: body.emoji ?? null,
        sortOrder: body.sortOrder ?? null,
      }
    );
    if (!result.rowsAffected[0]) return notFound("Konu bulunamadı");
    return NextResponse.json({ topics: await listTopics(session.userId) });
  } catch (e) {
    if (isUniqueViolation(e)) return badRequest("Bu adda bir konu zaten var");
    return serverError("Konu güncellenemedi");
  }
}

/** Archives the topic so past charts keep their colours and names. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const id = parseId((await ctx.params).id);
  if (id === null) return notFound();

  try {
    // A running session on this topic is stopped first.
    await execute(
      `UPDATE dbo.FocusSessions SET EndedAt = SYSUTCDATETIME()
         WHERE UserId = @userId AND TopicId = @id AND EndedAt IS NULL;
       UPDATE dbo.Topics SET ArchivedAt = SYSUTCDATETIME()
         WHERE Id = @id AND UserId = @userId AND ArchivedAt IS NULL;`,
      { id, userId: session.userId }
    );
    return NextResponse.json({ topics: await listTopics(session.userId) });
  } catch {
    return serverError("Konu arşivlenemedi");
  }
}
