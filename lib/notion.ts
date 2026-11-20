import { decrypt, encrypt } from "./crypto";
import { execute, query } from "./db";
import { getIstanbulDateString } from "./date";

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const MAX_DEPTH = 3;
const REQUEST_BUDGET = 60;
const CACHE_MS = 3_000;

// ---------- types ----------

export class NotionError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type RichText = { plain_text: string };
export type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  last_edited_time: string;
  to_do?: { rich_text: RichText[]; checked: boolean };
  child_page?: { title: string };
};
export type TreeNode = { block: NotionBlock; children: TreeNode[] };
export type ChildPage = { id: string; title: string };

export type TodoItem = {
  id: string;
  text: string;
  checked: boolean;
  depth: number;
  /** Ticked today (Istanbul): checked and the block was last edited today. */
  doneToday: boolean;
};

export type PageSummary = { id: string; title: string; icon: string | null; editedAt: string };

export type Snapshot =
  | { status: "disconnected" }
  /** The NotionConnections table is missing (run `npm run db:setup`). */
  | { status: "unavailable" }
  | { status: "needs_page"; workspace: string | null }
  | {
      status: "ok";
      workspace: string | null;
      pageTitle: string;
      todo: TodoItem[];
      done: TodoItem[];
      todayDone: number;
      partial: boolean;
      /** Sub-pages of the selected page (a container page has these but no to-dos). */
      childPages: ChildPage[];
      /** Notion could not be reached on the last try; this is the last good data. */
      stale?: boolean;
      fetchedAt: string;
    }
  | { status: "error"; workspace: string | null; pageTitle: string | null; message: string };

type Connection = {
  AccessCipher: string;
  WorkspaceName: string | null;
  PageId: string | null;
  PageTitle: string | null;
};

// NOTION_MOCK=1 serves a fixture page; NOTION_MOCK=container starts on a container
// page that only has sub-pages. Never active in production.
const mockEnabled = () =>
  (process.env.NOTION_MOCK === "1" || process.env.NOTION_MOCK === "container") &&
  process.env.NODE_ENV !== "production";

const mockState: { pageId: string | null; title: string | null } =
  process.env.NOTION_MOCK === "container"
    ? { pageId: "mock-container", title: "Örnek klasör" }
    : { pageId: "mock-page", title: "Örnek yapılacaklar" };

// ---------- HTTP ----------

async function notionFetch<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < 2) {
      const wait = Number(res.headers.get("retry-after") ?? "1");
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000));
      continue;
    }
    if (!res.ok) throw new NotionError(res.status, `Notion ${res.status}`);
    return (await res.json()) as T;
  }
  throw new NotionError(429, "Notion rate limited");
}

export async function exchangeCode(code: string, redirectUri: string) {
  const id = process.env.NOTION_CLIENT_ID;
  const secret = process.env.NOTION_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Notion OAuth is not configured");

  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    cache: "no-store",
  });
  if (!res.ok) throw new NotionError(res.status, "Token exchange failed");
  const data = (await res.json()) as { access_token: string; workspace_name?: string | null };
  return { accessToken: data.access_token, workspaceName: data.workspace_name ?? null };
}

// ---------- pages ----------

type SearchPage = {
  id: string;
  last_edited_time: string;
  icon?: { type: string; emoji?: string } | null;
  properties?: Record<string, { type: string; title?: RichText[] }>;
};

function pageTitle(page: SearchPage): string {
  const prop = Object.values(page.properties ?? {}).find((p) => p.type === "title");
  const text = (prop?.title ?? []).map((t) => t.plain_text).join("").trim();
  return text || "Başlıksız";
}

export async function listPages(token: string): Promise<PageSummary[]> {
  if (token === "mock") {
    return [
      { id: "mock-container", title: "Örnek klasör", icon: "📁", editedAt: new Date().toISOString() },
      { id: "mock-page", title: "Örnek yapılacaklar", icon: "✅", editedAt: new Date().toISOString() },
      { id: "mock-page-2", title: "Haftalık plan", icon: "🗓️", editedAt: new Date().toISOString() },
    ];
  }

  const pages: PageSummary[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 5; i++) {
    const data = await notionFetch<{ results: SearchPage[]; has_more: boolean; next_cursor: string | null }>(
      token,
      "/search",
      {
        method: "POST",
        body: JSON.stringify({
          filter: { property: "object", value: "page" },
          sort: { direction: "descending", timestamp: "last_edited_time" },
          page_size: 100,
          ...(cursor ? { start_cursor: cursor } : {}),
        }),
      }
    );
    for (const p of data.results) {
      pages.push({
        id: p.id,
        title: pageTitle(p),
        icon: p.icon?.type === "emoji" ? (p.icon.emoji ?? null) : null,
        editedAt: p.last_edited_time,
      });
    }
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return pages;
}

// ---------- blocks ----------

type Budget = { left: number; partial: boolean };
const SKIP_CHILDREN = new Set(["child_page", "child_database", "link_to_page"]);

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += limit) {
    await Promise.all(items.slice(i, i + limit).map(fn));
  }
}

async function fetchChildren(token: string, id: string, budget: Budget): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    if (budget.left <= 0) {
      budget.partial = true;
      break;
    }
    budget.left -= 1;
    const qs = new URLSearchParams({ page_size: "100", ...(cursor ? { start_cursor: cursor } : {}) });
    const data = await notionFetch<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }>(
      token,
      `/blocks/${id}/children?${qs}`
    );
    blocks.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

async function buildTree(token: string, id: string, depth: number, budget: Budget): Promise<TreeNode[]> {
  const nodes: TreeNode[] = (await fetchChildren(token, id, budget)).map((block) => ({ block, children: [] }));
  const withKids = nodes.filter((n) => n.block.has_children && !SKIP_CHILDREN.has(n.block.type));

  if (depth >= MAX_DEPTH) {
    if (withKids.length > 0) budget.partial = true;
    return nodes;
  }
  await mapLimit(withKids, 3, async (n) => {
    n.children = await buildTree(token, n.block.id, depth + 1, budget);
  });
  return nodes;
}

export async function fetchTodoTree(token: string, pageId: string) {
  if (token === "mock") {
    return { tree: pageId === "mock-container" ? MOCK_CONTAINER_TREE() : MOCK_TREE(), partial: false };
  }
  const budget: Budget = { left: REQUEST_BUDGET, partial: false };
  const tree = await buildTree(token, pageId, 0, budget);
  return { tree, partial: budget.partial };
}

/** Pure: flattens the block tree into to-do items in document order. */
export function flattenTodos(tree: TreeNode[], today: string): TodoItem[] {
  const items: TodoItem[] = [];
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const { block, children } of nodes) {
      const isTodo = block.type === "to_do" && block.to_do;
      if (isTodo) {
        const checked = block.to_do!.checked;
        items.push({
          id: block.id,
          text: block.to_do!.rich_text.map((t) => t.plain_text).join("").trim() || "(boş)",
          checked,
          depth,
          doneToday: checked && getIstanbulDateString(new Date(block.last_edited_time)) === today,
        });
      }
      walk(children, isTodo ? depth + 1 : depth);
    }
  };
  walk(tree, 0);
  return items;
}

/** Pure: sub-pages (child_page blocks) found anywhere in the tree, in document order. */
export function collectChildPages(tree: TreeNode[]): ChildPage[] {
  const pages: ChildPage[] = [];
  const walk = (nodes: TreeNode[]) => {
    for (const { block, children } of nodes) {
      if (block.type === "child_page" && block.child_page) {
        pages.push({ id: block.id, title: block.child_page.title.trim() || "Başlıksız" });
      }
      walk(children);
    }
  };
  walk(tree);
  return pages;
}

// ---------- connection storage ----------

export async function getConnection(userId: number): Promise<Connection | null> {
  // Dev-only: NOTION_MOCK=disconnected previews the "connect" screen.
  if (process.env.NOTION_MOCK === "disconnected" && process.env.NODE_ENV !== "production") return null;
  if (mockEnabled()) {
    return { AccessCipher: "", WorkspaceName: "Mock", PageId: mockState.pageId, PageTitle: mockState.title };
  }
  const rows = await query<Connection>(
    "SELECT AccessCipher, WorkspaceName, PageId, PageTitle FROM dbo.NotionConnections WHERE UserId = @userId",
    { userId }
  );
  return rows[0] ?? null;
}

export function connectionToken(conn: Connection): string {
  return mockEnabled() ? "mock" : decrypt(conn.AccessCipher);
}

export async function saveConnection(userId: number, accessToken: string, workspace: string | null) {
  await execute(
    `MERGE dbo.NotionConnections AS t
     USING (SELECT @userId AS UserId) AS s ON t.UserId = s.UserId
     WHEN MATCHED THEN
       UPDATE SET AccessCipher = @cipher, WorkspaceName = @workspace, PageId = NULL, PageTitle = NULL, CreatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (UserId, AccessCipher, WorkspaceName) VALUES (@userId, @cipher, @workspace);`,
    { userId, cipher: encrypt(accessToken), workspace }
  );
  forget(userId);
}

export async function setPage(userId: number, pageId: string | null, title: string | null) {
  if (mockEnabled()) {
    mockState.pageId = pageId;
    mockState.title = title;
    forget(userId);
    return;
  }
  await execute("UPDATE dbo.NotionConnections SET PageId = @pageId, PageTitle = @title WHERE UserId = @userId", {
    userId,
    pageId,
    title,
  });
  forget(userId);
}

export async function deleteConnection(userId: number) {
  if (mockEnabled()) {
    forget(userId);
    return;
  }
  await execute("DELETE FROM dbo.NotionConnections WHERE UserId = @userId", { userId });
  forget(userId);
}

/** True when the user's counter is driven by a selected Notion page. */
export async function isCounterLocked(userId: number): Promise<boolean> {
  const conn = await getConnection(userId);
  return Boolean(conn?.PageId);
}

// ---------- snapshot + counter sync ----------

const cache = new Map<number, { at: number; value: Snapshot }>();
/** Concurrent callers for the same user share one Notion round. */
const inflight = new Map<number, Promise<Snapshot>>();
/** Last successful snapshot per user, served as `stale` when Notion is unreachable. */
const lastOk = new Map<number, Extract<Snapshot, { status: "ok" }>>();

/** Drop cached data when the connection or selected page changes. */
function forget(userId: number) {
  cache.delete(userId);
  lastOk.delete(userId);
}

async function syncTodayCount(userId: number, count: number) {
  await execute(
    `MERGE dbo.DailyTaskCounts AS target
     USING (SELECT @userId AS UserId, @date AS CountDate) AS source
     ON target.UserId = source.UserId AND target.CountDate = source.CountDate
     WHEN MATCHED THEN UPDATE SET Count = @count
     WHEN NOT MATCHED THEN INSERT (UserId, CountDate, Count) VALUES (@userId, @date, @count);`,
    { userId, date: getIstanbulDateString(), count }
  );
}

/**
 * Reads the selected Notion page, and writes today's tick count to the
 * "Yapılan Görev" counter. Cached briefly so polling stays cheap.
 */
export async function getTodoSnapshot(userId: number, { fresh = false } = {}): Promise<Snapshot> {
  const hit = cache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const pending = inflight.get(userId);
  if (pending) return pending;

  const round = (async () => {
    let value = await loadSnapshot(userId);
    if (value.status === "ok") {
      lastOk.set(userId, value);
    } else if (value.status === "error") {
      // Keep showing the last good data while Notion is unreachable (e.g. rate limited).
      const previous = lastOk.get(userId);
      if (previous) value = { ...previous, stale: true };
    } else {
      lastOk.delete(userId);
    }
    cache.set(userId, { at: Date.now(), value });
    return value;
  })().finally(() => inflight.delete(userId));

  inflight.set(userId, round);
  return round;
}

async function loadSnapshot(userId: number): Promise<Snapshot> {
  let conn: Connection | null;
  try {
    conn = await getConnection(userId);
  } catch {
    return { status: "unavailable" };
  }
  if (!conn) return { status: "disconnected" };
  if (!conn.PageId) return { status: "needs_page", workspace: conn.WorkspaceName };

  try {
    const { tree, partial } = await fetchTodoTree(connectionToken(conn), conn.PageId);
    const items = flattenTodos(tree, getIstanbulDateString());
    const todayDone = items.filter((i) => i.doneToday).length;
    // The mock fixture must never overwrite real counters.
    if (!mockEnabled()) await syncTodayCount(userId, todayDone);

    return {
      status: "ok",
      workspace: conn.WorkspaceName,
      pageTitle: conn.PageTitle ?? "Notion sayfası",
      todo: items.filter((i) => !i.checked),
      done: items.filter((i) => i.checked),
      todayDone,
      partial,
      childPages: collectChildPages(tree),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof NotionError && error.status === 401) {
      await deleteConnection(userId);
      return { status: "disconnected" };
    }
    if (error instanceof NotionError && (error.status === 404 || error.status === 400)) {
      await setPage(userId, null, null);
      return { status: "needs_page", workspace: conn.WorkspaceName };
    }
    return {
      status: "error",
      workspace: conn.WorkspaceName,
      pageTitle: conn.PageTitle,
      message: "Notion'a şu an ulaşılamıyor.",
    };
  }
}

// ---------- development fixture (NOTION_MOCK=1) ----------

function MOCK_TREE(): TreeNode[] {
  const now = new Date().toISOString();
  const old = "2020-01-01T00:00:00.000Z";
  const todo = (id: string, text: string, checked: boolean, edited = now, kids: TreeNode[] = []): TreeNode => ({
    block: { id, type: "to_do", has_children: kids.length > 0, last_edited_time: edited, to_do: { rich_text: [{ plain_text: text }], checked } },
    children: kids,
  });
  return [
    todo("m1", "Örnek görev 1", true),
    todo("m2", "Örnek görev 2", true),
    todo("m3", "Örnek görev 3", false),
    todo("m4", "Dünden kalan tikli görev", true, old),
    todo("m5", "Alt maddeli görev", false, now, [todo("m5a", "Tikli alt madde", true), todo("m5b", "Tiksiz alt madde", false)]),
    todo("m6", "Örnek görev 4", false),
    // Flips every 10 s so live updates can be watched without touching Notion.
    todo("m7", "Canlı deneme (10 sn'de bir değişir)", Math.floor(Date.now() / 10_000) % 2 === 0),
  ];
}

function MOCK_CONTAINER_TREE(): TreeNode[] {
  const child = (id: string, title: string): TreeNode => ({
    block: {
      id,
      type: "child_page",
      has_children: true,
      last_edited_time: new Date().toISOString(),
      child_page: { title },
    },
    children: [],
  });
  return [child("mock-page", "Örnek sayfa A"), child("mock-weekly", "Örnek sayfa B"), child("mock-monthly", "Örnek sayfa C")];
}
