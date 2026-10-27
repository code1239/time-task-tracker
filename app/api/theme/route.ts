import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { execute } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz tema" }, { status: 400 });

  await execute("UPDATE dbo.Users SET ThemePreference = @theme WHERE Id = @userId", {
    theme: parsed.data.theme,
    userId: session.userId,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const { query } = await import("@/lib/db");
  const rows = await query<any>("SELECT ThemePreference FROM dbo.Users WHERE Id = @userId", { userId: session.userId });
  return NextResponse.json({ theme: rows[0]?.ThemePreference || "system" });
}
