import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

/** AES-256-GCM helpers for secrets stored in the database (e.g. Notion tokens). */

function key(): Buffer {
  const explicit = process.env.NOTION_TOKEN_KEY;
  if (explicit) return createHash("sha256").update(explicit).digest();

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("NOTION_TOKEN_KEY or JWT_SECRET must be set");
  return Buffer.from(hkdfSync("sha256", secret, "ttt-salt", "notion-token", 32));
}

/** Returns `iv.tag.ciphertext`, each part base64url. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !data) throw new Error("Malformed ciphertext");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
