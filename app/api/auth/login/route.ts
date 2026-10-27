import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const loginAttempts = new Map<string, { count: number; last: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const key = ip;
    const now = Date.now();
    const attempts = loginAttempts.get(key) || { count: 0, last: now };
    if (now - attempts.last > 60000) {
      attempts.count = 0;
    }
    if (attempts.count >= 5) {
      return NextResponse.json({ error: "Çok fazla deneme. Lütfen bir dakika sonra tekrar deneyin." }, { status: 429 });
    }
    attempts.count++;
    attempts.last = now;
    loginAttempts.set(key, attempts);

    const { username, password } = parsed.data;
    const users = await query<{ Id: number; Username: string; PasswordHash: string }>(
      "SELECT Id, Username, PasswordHash FROM dbo.Users WHERE Username = @username",
      { username }
    );
    if (users.length === 0) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.PasswordHash);
    if (!valid) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 });
    }

    loginAttempts.delete(key);
    await createSession(user.Id, user.Username);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
