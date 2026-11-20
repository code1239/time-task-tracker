import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { execute, query } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz tema" }, { status: 400 });

  await execute("UPDATE dbo.Users SET ThemePreference = @theme WHERE Id = @userId", {
    theme: parsed.data.theme,
    userId: session.userId,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const rows = await query<{ ThemePreference: "light" | "dark" | "system" | null }>(
    "SELECT ThemePreference FROM dbo.Users WHERE Id = @userId",
    { userId: session.userId }
  );
  return NextResponse.json({ theme: rows[0]?.ThemePreference || "system" });
}
