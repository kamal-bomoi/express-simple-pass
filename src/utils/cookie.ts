import type { Request, Response } from "express";
import { parse, type SerializeOptions, serialize } from "cookie";
import type { CookieOptions } from "../types.js";

export function read_cookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;

  if (!header) return undefined;

  return parse(header)[name];
}

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

function append_set_cookie(res: Response, value: string): void {
  const existing = res.getHeader("Set-Cookie");

  if (!existing) return void res.setHeader("Set-Cookie", value);

  if (Array.isArray(existing))
    return void res.setHeader("Set-Cookie", [...existing, value]);

  res.setHeader("Set-Cookie", [String(existing), value]);
}

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

export function normalize_root_path(p: string): string {
  let out = p.trim();

  if (!out.startsWith("/")) out = `/${out}`;

  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);

  return out;
}
