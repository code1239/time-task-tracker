import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { exchangeCode, saveConnection } from "@/lib/notion";
import { NOTION_STATE_COOKIE, notionConfig, notionRedirect } from "@/lib/notion-config";

function sameState(a: string | undefined, b: string | null) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const config = notionConfig();
  if (!config) return NextResponse.json({ error: "Notion yapılandırılmamış" }, { status: 503 });

  const fail = () => {
    const res = NextResponse.redirect(notionRedirect(config.origin, "error"));
    res.cookies.delete({ name: NOTION_STATE_COOKIE, path: "/api/notion" });
    return res;
  };

  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  // User cancelled on Notion's consent screen, or the state does not match.
  if (params.get("error") || !code) return fail();
  if (!sameState(req.cookies.get(NOTION_STATE_COOKIE)?.value, params.get("state"))) return fail();

  try {
    const { accessToken, workspaceName } = await exchangeCode(code, config.redirectUri);
    await saveConnection(session.userId, accessToken, workspaceName);
  } catch {
    return fail();
  }

  const res = NextResponse.redirect(notionRedirect(config.origin));
  res.cookies.delete({ name: NOTION_STATE_COOKIE, path: "/api/notion" });
  return res;
}
