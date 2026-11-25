import { query } from "./db";
import { isCounterLocked } from "./notion";
import { addDaysToDateString, getIstanbulDateString } from "./date";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type Topic = {
  id: number;
  name: string;
  emoji: string;
  slot: number;
  sortOrder: number;
  archived: boolean;
};

export type FocusSession = {
  id: number;
  topicId: number;
  title: string | null;
  startedAt: Date;
  endedAt: Date | null;
  completed: boolean;
  source: "timer" | "manual";
  /** Minutes the user set for a countdown session; null = open-ended count-up. */
  plannedMinutes: number | null;
};

export type Segment = {
  id: number;
  topicId: number;
  title: string | null;
  start: string;
  end: string;
  minutes: number;
  running: boolean;
  completed: boolean;
  source: "timer" | "manual";
};

export type TopicShare = {
  id: number;
  name: string;
  emoji: string;
  slot: number;
  minutes: number;
  pct: number;
};

export const SLOT_COUNT = 8;

export const DEFAULT_TOPICS: { name: string; emoji: string }[] = [
  { name: "Kodlama", emoji: "💻" },
  { name: "Okuma", emoji: "📚" },
  { name: "Spor", emoji: "🏀" },
  { name: "Mola", emoji: "☕" },
];

/* ------------------------------------------------------------------ */
/* Pure helpers (Istanbul is fixed at UTC+3, no DST)                    */
/* ------------------------------------------------------------------ */

const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** UTC instants for the start and end of an Istanbul calendar day. */
export function istanbulDayBounds(date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

const toMinutes = (ms: number) => Math.max(0, ms) / 60_000;

/** Clip sessions to one Istanbul day; a running session counts up to `now`. */
export function clipSessionsToDay(sessions: FocusSession[], date: string, now: Date): Segment[] {
  const { start, end } = istanbulDayBounds(date);
  const segments: Segment[] = [];
  for (const s of sessions) {
    const sEnd = s.endedAt ?? now;
    const from = Math.max(s.startedAt.getTime(), start.getTime());
    const to = Math.min(sEnd.getTime(), end.getTime());
    if (to <= from) continue;
    segments.push({
      id: s.id,
      topicId: s.topicId,
      title: s.title,
      start: new Date(from).toISOString(),
      end: new Date(to).toISOString(),
      minutes: toMinutes(to - from),
      running: s.endedAt === null,
      completed: s.completed,
      source: s.source,
    });
  }
  return segments.sort((a, b) => a.start.localeCompare(b.start));
}

/** Integer percentages that always sum to 100 (largest remainder). */
export function roundPercentages(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const floors = raw.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, r: v - Math.floor(v) }))
    .sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

/** Minutes per topic, largest first, with shares that sum to 100. */
export function shareByTopic(minutesByTopic: Map<number, number>, topics: Topic[]): TopicShare[] {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const entries = [...minutesByTopic.entries()].filter(([, m]) => m > 0);
  const pcts = roundPercentages(entries.map(([, m]) => m));
  return entries
    .map(([id, minutes], i) => {
      const t = byId.get(id);
      return {
        id,
        name: t?.name ?? "Silinmiş konu",
        emoji: t?.emoji ?? "•",
        slot: t?.slot ?? 1,
        minutes: Math.round(minutes * 10) / 10,
        pct: pcts[i],
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}

export function minutesByTopic(segments: Segment[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of segments) map.set(s.topicId, (map.get(s.topicId) ?? 0) + s.minutes);
  return map;
}

/** Consecutive active days ending today (or yesterday, if today is still empty). */
export function computeStreak(activeDays: Set<string>, today: string): number {
  let day = activeDays.has(today) ? today : addDaysToDateString(today, -1);
  let streak = 0;
  while (activeDays.has(day)) {
    streak += 1;
    day = addDaysToDateString(day, -1);
  }
  return streak;
}

/** Every Istanbul day a session touches (a session past midnight counts for both). */
export function daysTouched(s: FocusSession, now: Date): string[] {
  const end = s.endedAt ?? now;
  const first = getIstanbulDateString(s.startedAt);
  const last = getIstanbulDateString(new Date(Math.max(end.getTime() - 1, s.startedAt.getTime())));
  const days = [first];
  while (days[days.length - 1] < last) days.push(addDaysToDateString(days[days.length - 1], 1));
  return days;
}

/* ------------------------------------------------------------------ */
/* Database                                                            */
/* ------------------------------------------------------------------ */

type TopicRow = {
  Id: number;
  Name: string;
  Emoji: string;
  ColorSlot: number;
  SortOrder: number;
  ArchivedAt: Date | null;
};

const toTopic = (r: TopicRow): Topic => ({
  id: r.Id,
  name: r.Name,
  emoji: r.Emoji,
  slot: r.ColorSlot,
  sortOrder: r.SortOrder,
  archived: r.ArchivedAt !== null,
});

export async function listTopics(userId: number, { includeArchived = false } = {}): Promise<Topic[]> {
  const rows = await query<TopicRow>(
    `SELECT Id, Name, Emoji, ColorSlot, SortOrder, ArchivedAt FROM dbo.Topics
     WHERE UserId = @userId ${includeArchived ? "" : "AND ArchivedAt IS NULL"}
     ORDER BY SortOrder, Id`,
    { userId }
  );
  return rows.map(toTopic);
}

/**
 * Colour slots stay with a topic for life. A new topic takes the first slot no
 * active topic uses, so colours never shift when the list is reordered.
 */
export function pickSlot(activeSlots: number[], totalEver: number): number {
  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    if (!activeSlots.includes(slot)) return slot;
  }
  return (totalEver % SLOT_COUNT) + 1;
}

type SessionRow = {
  Id: number | string;
  TopicId: number;
  Title: string | null;
  StartedAt: Date;
  EndedAt: Date | null;
  Completed: boolean;
  Source: "timer" | "manual";
  PlannedMinutes: number | null;
};

const toSession = (r: SessionRow): FocusSession => ({
  id: Number(r.Id),
  topicId: r.TopicId,
  title: r.Title,
  startedAt: new Date(r.StartedAt),
  endedAt: r.EndedAt ? new Date(r.EndedAt) : null,
  completed: Boolean(r.Completed),
  source: r.Source,
  plannedMinutes: r.PlannedMinutes ?? null,
});

const SESSION_COLUMNS = "Id, TopicId, Title, StartedAt, EndedAt, Completed, Source, PlannedMinutes";

/**
 * A timed session whose time is up is closed at exactly its planned length,
 * whether or not a browser was open. There is no background job: every read or
 * write of sessions settles first, so the saved time is always right.
 */
export async function settleExpiredSessions(userId: number): Promise<void> {
  await query(
    `UPDATE dbo.FocusSessions
        SET EndedAt = DATEADD(MINUTE, PlannedMinutes, StartedAt)
      WHERE UserId = @userId AND EndedAt IS NULL AND PlannedMinutes IS NOT NULL
        AND DATEADD(MINUTE, PlannedMinutes, StartedAt) <= SYSUTCDATETIME()`,
    { userId }
  );
}

export async function getRunningSession(userId: number): Promise<FocusSession | null> {
  await settleExpiredSessions(userId);
  const rows = await query<SessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM dbo.FocusSessions WHERE UserId = @userId AND EndedAt IS NULL`,
    { userId }
  );
  return rows[0] ? toSession(rows[0]) : null;
}

/** Sessions overlapping [from, to). */
export async function sessionsBetween(userId: number, from: Date, to: Date): Promise<FocusSession[]> {
  await settleExpiredSessions(userId);
  const rows = await query<SessionRow>(
    `SELECT ${SESSION_COLUMNS} FROM dbo.FocusSessions
     WHERE UserId = @userId AND StartedAt < @to AND (EndedAt IS NULL OR EndedAt > @from)
     ORDER BY StartedAt`,
    { userId, from, to }
  );
  return rows.map(toSession);
}

/** Days with any focus time or a completed task, for the streak. */
export async function activeDaysSince(userId: number, fromDate: string, now: Date): Promise<Set<string>> {
  const from = istanbulDayBounds(fromDate).start;
  const sessions = await sessionsBetween(userId, from, now);
  const days = new Set<string>();
  for (const s of sessions) for (const d of daysTouched(s, now)) if (d >= fromDate) days.add(d);

  const taskRows = await query<{ CountDate: Date | string }>(
    `SELECT CountDate FROM dbo.DailyTaskCounts
     WHERE UserId = @userId AND CountDate >= @fromDate AND Count > 0`,
    { userId, fromDate }
  );
  for (const r of taskRows) days.add(dateKey(r.CountDate));
  return days;
}

export function dateKey(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

export async function getTaskCounts(userId: number, from: string, to: string) {
  const rows = await query<{ CountDate: Date | string; Count: number }>(
    `SELECT CountDate, Count FROM dbo.DailyTaskCounts
     WHERE UserId = @userId AND CountDate BETWEEN @from AND @to`,
    { userId, from, to }
  );
  return new Map(rows.map((r) => [dateKey(r.CountDate), r.Count]));
}

export const serializeSession = (s: FocusSession) => ({
  id: s.id,
  topicId: s.topicId,
  title: s.title,
  startedAt: s.startedAt.toISOString(),
  endedAt: s.endedAt?.toISOString() ?? null,
  completed: s.completed,
  source: s.source,
  plannedMinutes: s.plannedMinutes,
});

/** Shared parse for `?date=` / route ids. */
export const isDateString = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Adds one finished task to today's counter. Skipped while a Notion page drives
 * the counter (the count then comes from Notion).
 */
export async function bumpTodayTasks(userId: number): Promise<{ count: number | null; locked: boolean }> {
  if (await isCounterLocked(userId).catch(() => false)) return { count: null, locked: true };
  const out = await query<{ Count: number }>(
    `MERGE dbo.DailyTaskCounts AS target
     USING (SELECT @userId AS UserId, @date AS CountDate) AS source
     ON target.UserId = source.UserId AND target.CountDate = source.CountDate
     WHEN MATCHED THEN UPDATE SET Count = target.Count + 1
     WHEN NOT MATCHED THEN INSERT (UserId, CountDate, Count) VALUES (@userId, @date, 1)
     OUTPUT inserted.Count;`,
    { userId, date: getIstanbulDateString() }
  );
  return { count: out[0]?.Count ?? null, locked: false };
}
