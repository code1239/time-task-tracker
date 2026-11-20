import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const WINDOW_MS = 60_000;
const MAX_FAILURES = 5;
const failures = new Map<string, { count: number; first: number }>();

function clientKey(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isLimited(key: string, now: number) {
  // Sweep expired entries so the map cannot grow without bound.
  for (const [k, v] of failures) {
    if (now - v.first > WINDOW_MS) failures.delete(k);
  }
  return (failures.get(key)?.count ?? 0) >= MAX_FAILURES;
}

function recordFailure(key: string, now: number) {
  const entry = failures.get(key);
  if (entry) entry.count += 1;
  else failures.set(key, { count: 1, first: now });
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invalidCredentials(key: string) {
  recordFailure(key, Date.now());
  await delay(500);
  return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
    }

    const key = clientKey(req);
    if (isLimited(key, Date.now())) {
      return NextResponse.json(
        { error: "Çok fazla deneme. Lütfen bir dakika sonra tekrar deneyin." },
        { status: 429 }
      );
    }

    const { username, password } = parsed.data;
    const users = await query<{ Id: number; Username: string; PasswordHash: string }>(
      "SELECT Id, Username, PasswordHash FROM dbo.Users WHERE Username = @username",
      { username }
    );
    const user = users[0];
    if (!user || !(await bcrypt.compare(password, user.PasswordHash))) {
      return invalidCredentials(key);
    }

    failures.delete(key);
    await createSession(user.Id, user.Username);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
