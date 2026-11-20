import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import {
  NotionError,
  connectionToken,
  deleteConnection,
  getConnection,
  getTodoSnapshot,
  listPages,
  setPage,
} from "@/lib/notion";

const schema = z.object({ pageId: z.string().min(8).max(64) });

export async function GET() {
  const { session, response } = await requireSession();
  if (response) return response;

  const conn = await getConnection(session.userId);
  if (!conn) return NextResponse.json({ connected: false });

  try {
    const pages = await listPages(connectionToken(conn));
    return NextResponse.json({ connected: true, selected: conn.PageId, pages });
  } catch (error) {
    if (error instanceof NotionError && error.status === 401) {
      await deleteConnection(session.userId);
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({ error: "Notion sayfaları alınamadı" }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requireSession();
  if (response) return response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });

  const conn = await getConnection(session.userId);
  if (!conn) return NextResponse.json({ error: "Notion bağlı değil" }, { status: 409 });

  try {
    const normalize = (id: string) => id.replace(/-/g, "").toLowerCase();
    const wanted = normalize(parsed.data.pageId);

    // Only pages the user shared with the integration can be selected: either one
    // from the search results, or a sub-page of the page that is selected now
    // (search can lag behind for freshly shared pages).
    let page: { id: string; title: string } | undefined;
    const current = await getTodoSnapshot(session.userId);
    if (current.status === "ok") {
      page = current.childPages.find((p) => normalize(p.id) === wanted);
    }
    if (!page) {
      const pages = await listPages(connectionToken(conn));
      page = pages.find((p) => normalize(p.id) === wanted);
    }
    if (!page) return NextResponse.json({ error: "Sayfa bulunamadı" }, { status: 404 });

    await setPage(session.userId, page.id, page.title);
    // Sync the counter right away so the Tasks tab reflects the new page.
    await getTodoSnapshot(session.userId, { fresh: true });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Notion'a ulaşılamadı" }, { status: 502 });
  }
}
