import type { Request, Response } from "express";
import { parse, type SerializeOptions, serialize } from "cookie";
import type { CookieOptions } from "../types.js";

/**
 * Read a cookie by name directly from request headers.
 * This avoids cookie-parser, preventing conflicts with a host app's setup.
 */
export function read_cookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;

  if (!header) return undefined;

  return parse(header)[name];
}

/**
 * Append a Set-Cookie header to the response without clobbering any
 * existing Set-Cookie values written by other middleware.
 */
export function write_cookie({
  name,
  value,
  options,
  res
}: {
  res: Response;
  name: string;
  value: string;
  options: SerializeOptions;
}): void {
  const serialized = serialize(name, value, options);

  append_set_cookie(res, serialized);
}

/**
 * Add Set-Cookie without overwriting existing Set-Cookie headers.
 * Some apps set multiple cookies; we must preserve all of them.
 */
function append_set_cookie(res: Response, value: string): void {
  const existing = res.getHeader("Set-Cookie");

  if (!existing) return void res.setHeader("Set-Cookie", value);

  if (Array.isArray(existing))
    return void res.setHeader("Set-Cookie", [...existing, value]);

  res.setHeader("Set-Cookie", [String(existing), value]);
}

/**
 * Clear the authentication cookie.
 * IMPORTANT: cookie deletion must match path/domain/samesite/secure.
 * We reuse the same cookie options and set maxAge to 0.
 */
export function clear_cookie({
  res,
  name,
  options
}: {
  res: Response;
  name: string;
  options: SerializeOptions;
}): void {
  const serialized = serialize(name, "", {
    ...options,
    maxAge: 0
  });

  append_set_cookie(res, serialized);
}

/**
 * Builds the final cookie options for a given write operation.
 * `secure` defaults to true when NODE_ENV is "production" unless explicitly overridden.
 * `httpOnly` is always true — not negotiable.
 * `maxAge` is always driven by ttl, never user-supplied.
 */
export function build_cookie_options(
  user_options: CookieOptions,
  ttl: number
): SerializeOptions {
  return {
    path: "/",
    sameSite: "lax",
    ...user_options,
    httpOnly: true,
    maxAge: ttl
  };
}

/**
 * Normalize / validate the root path used for login routes.
 * - Ensures it starts with "/"
 * - Removes trailing slash (except "/")
 */
export function normalize_root_path(p: string): string {
  let out = p.trim();

  if (!out.startsWith("/")) out = `/${out}`;

  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);

  return out;
}
