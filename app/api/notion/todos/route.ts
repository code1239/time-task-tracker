import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getTodoSnapshot } from "@/lib/notion";

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const snapshot = await getTodoSnapshot(session.userId, { fresh });
  return NextResponse.json(snapshot);
}
