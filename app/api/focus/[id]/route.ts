import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { notFound, parseId, serverError } from "@/lib/api";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { session, response } = await requireSession();
  if (response) return response;
  const id = parseId((await ctx.params).id);
  if (id === null) return notFound();

  try {
    const result = await execute("DELETE FROM dbo.FocusSessions WHERE Id = @id AND UserId = @userId", {
      id,
      userId: session.userId,
    });
    if (!result.rowsAffected[0]) return notFound("Oturum bulunamadı");
    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Oturum silinemedi");
  }
}
