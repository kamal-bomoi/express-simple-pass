import path from "node:path";
import fs from "node:fs";
import { VIEWS_DIR } from "./constants.js";

export function view(name: string): string {
  return path.join(VIEWS_DIR, `${name}.pug`);
}

export function inlinify(content: string): string {
  return path.isAbsolute(content) ? fs.readFileSync(content, "utf-8") : content;
}

/**
 * Validates a redirect target is a safe relative path.
 * Prevents open redirect attacks.
 */
export function safe_redirect(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;

  if (!raw.startsWith("/")) return fallback;

  if (raw.startsWith("//")) return fallback;

  return raw;
}
