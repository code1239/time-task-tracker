import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, sessionSecret } from "@/lib/session-config";

async function hasValidSession(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = sessionSecret();
  if (!token || !secret) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const valid = await hasValidSession(req);

  if (req.nextUrl.pathname === "/login") {
    return valid ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }

  return valid ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/", "/login"],
};
