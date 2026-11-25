import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getRunningSession, serializeSession } from "@/lib/focus";
import { serverError } from "@/lib/api";

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;
  try {
    const running = await getRunningSession(session.userId);
    return NextResponse.json({ running: running ? serializeSession(running) : null, now: new Date().toISOString() });
  } catch {
    return serverError("Zamanlayıcı yüklenemedi");
  }
}
