import { NextResponse } from "next/server";
import type { z } from "zod";

export const badRequest = (error = "Geçersiz istek") => NextResponse.json({ error }, { status: 400 });
export const serverError = (error = "Bir hata oluştu") => NextResponse.json({ error }, { status: 500 });
export const notFound = (error = "Bulunamadı") => NextResponse.json({ error }, { status: 404 });

/** Parses a JSON body with a zod schema; returns `null` on any failure. */
export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  return parsed.success ? parsed.data : null;
}

/** Positive integer route id, or null. */
export function parseId(raw: string): number | null {
  return /^\d{1,12}$/.test(raw) ? Number(raw) : null;
}

/** SQL Server unique-key violation (2601/2627). */
export function isUniqueViolation(e: unknown): boolean {
  const n = (e as { number?: number; originalError?: { info?: { number?: number } } })?.number
    ?? (e as { originalError?: { info?: { number?: number } } })?.originalError?.info?.number;
  return n === 2601 || n === 2627;
}
