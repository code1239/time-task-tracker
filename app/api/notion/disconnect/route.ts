import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { deleteConnection } from "@/lib/notion";

export async function DELETE() {
  const { session, response } = await requireSession();
  if (response) return response;

  await deleteConnection(session.userId);
  return NextResponse.json({ ok: true });
}
