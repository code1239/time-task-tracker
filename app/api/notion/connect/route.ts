import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { NOTION_STATE_COOKIE, notionConfig, notionRedirect } from "@/lib/notion-config";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const config = notionConfig();
  if (!config) {
    // Not configured: come back to wherever the user is, not to a configured URL.
    return NextResponse.redirect(notionRedirect(req.nextUrl.origin, "config"));
  }

  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://api.notion.com/v1/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  res.cookies.set(NOTION_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/api/notion",
    maxAge: 600,
  });
  return res;
}
