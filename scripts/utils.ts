import crypto from "crypto";
import fs from "fs";
import path from "path";

export function generatePassword(length = 24): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

export function updateEnvLocal(key: string, value: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  let content = "";
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf8");
  }
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    if (content && !content.endsWith("\n")) content += "\n";
    content += `${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, content);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
