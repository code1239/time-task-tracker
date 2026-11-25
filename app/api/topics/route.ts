import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { DEFAULT_TOPICS, listTopics, pickSlot } from "@/lib/focus";
import { badRequest, isUniqueViolation, readJson, serverError } from "@/lib/api";

const schema = z.union([
  z.object({ preset: z.literal(true) }),
  z.object({
    name: z.string().trim().min(1).max(40),
    emoji: z.string().trim().min(1).max(16),
  }),
]);

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";
  try {
    return NextResponse.json({ topics: await listTopics(session.userId, { includeArchived }) });
  } catch {
    return serverError("Konular yüklenemedi");
  }
}

async function addTopic(userId: number, name: string, emoji: string) {
  const all = await listTopics(userId, { includeArchived: true });
  const existing = all.find((t) => t.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"));
  if (existing) {
    // Re-adding an archived topic brings it (and its colour) back.
    if (existing.archived) {
      await execute("UPDATE dbo.Topics SET ArchivedAt = NULL WHERE Id = @id AND UserId = @userId", {
        id: existing.id,
        userId,
      });
    }
    return;
  }
  const active = all.filter((t) => !t.archived);
  const slot = pickSlot(active.map((t) => t.slot), all.length);
  const order = active.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1;
  await query(
    `INSERT INTO dbo.Topics (UserId, Name, Emoji, ColorSlot, SortOrder)
     VALUES (@userId, @name, @emoji, @slot, @order)`,
    { userId, name, emoji, slot, order }
  );
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await readJson(req, schema);
  if (!body) return badRequest("Konu adı ve emoji gerekli");

  try {
    if ("preset" in body) {
      for (const t of DEFAULT_TOPICS) await addTopic(session.userId, t.name, t.emoji);
    } else {
      await addTopic(session.userId, body.name, body.emoji);
    }
    return NextResponse.json({ topics: await listTopics(session.userId) });
  } catch (e) {
    if (isUniqueViolation(e)) return badRequest("Bu adda bir konu zaten var");
    return serverError("Konu eklenemedi");
  }
}
