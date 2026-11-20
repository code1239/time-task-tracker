export const NOTION_STATE_COOKIE = "ttt_notion_state";

/** OAuth settings, or null when the integration is not configured. */
export function notionConfig() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri =
    process.env.NOTION_REDIRECT_URI || "http://localhost:3000/api/notion/callback";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri, origin: new URL(redirectUri).origin };
}

export function notionRedirect(origin: string, status?: "error" | "config") {
  const url = new URL("/", origin);
  url.searchParams.set("tab", "notion");
  if (status) url.searchParams.set("notion", status);
  return url;
}
