/** Shared by lib/auth.ts and proxy.ts; kept free of `next/headers` imports. */
export const SESSION_COOKIE = "ttt_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function sessionSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  return secret ? new TextEncoder().encode(secret) : null;
}
