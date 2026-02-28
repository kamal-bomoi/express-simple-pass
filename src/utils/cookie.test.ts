import { describe, it, expect } from "vitest";
import type { Request, Response } from "express";
import {
  build_cookie_options,
  clear_cookie,
  normalize_root_path,
  read_cookie,
  write_cookie
} from "./cookie.js";

describe("read_cookie", () => {
  it("returns the value of a named cookie", () => {
    const req = mock_req("foo=bar; baz=qux");

    expect(read_cookie(req, "foo")).toBe("bar");
    expect(read_cookie(req, "baz")).toBe("qux");
  });

  it("returns undefined if cookie is not present", () => {
    const req = mock_req("foo=bar");

    expect(read_cookie(req, "missing")).toBeUndefined();
  });

  it("returns undefined if no cookie header", () => {
    const req = mock_req(undefined);

    expect(read_cookie(req, "foo")).toBeUndefined();
  });
});

describe("write_cookie", () => {
  it("sets a Set-Cookie header", () => {
    const res = mock_res();

    write_cookie({ res, name: "test", value: "abc", options: { path: "/" } });
    expect(res._cookies).toHaveLength(1);
    expect(res._cookies[0]).toContain("test=abc");
  });

  it("appends to existing Set-Cookie headers without clobbering", () => {
    const res = mock_res();

    write_cookie({ res, name: "a", value: "1", options: { path: "/" } });
    write_cookie({ res, name: "b", value: "2", options: { path: "/" } });

    expect(res._cookies).toHaveLength(2);
    expect(res._cookies.some((c) => c.includes("a=1"))).toBe(true);
    expect(res._cookies.some((c) => c.includes("b=2"))).toBe(true);
  });
});

describe("clear_cookie", () => {
  it("sets maxAge=0 to delete the cookie", () => {
    const res = mock_res();

    clear_cookie({ res, name: "test", options: { path: "/" } });
    expect(res._cookies[0]).toContain("test=");
    expect(res._cookies[0]).toContain("Max-Age=0");
  });

  it("preserves other cookie options when clearing", () => {
    const res = mock_res();

    clear_cookie({
      res,
      name: "test",
      options: { path: "/admin", sameSite: "strict" }
    });

    expect(res._cookies[0]).toContain("Path=/admin");
    expect(res._cookies[0]).toContain("SameSite=Strict");
  });
});

describe("build_cookie_options", () => {
  it("always sets httpOnly to true", () => {
    const opts = build_cookie_options({ secure: true }, 3600);

    expect(opts.httpOnly).toBe(true);
  });

  it("always sets maxAge to the provided ttl", () => {
    const opts = build_cookie_options({ secure: true }, 3600);

    expect(opts.maxAge).toBe(3600);
  });

  it("defaults path to /", () => {
    const opts = build_cookie_options({ secure: true }, 3600);

    expect(opts.path).toBe("/");
  });

  it("defaults sameSite to lax", () => {
    const opts = build_cookie_options({ secure: true }, 3600);

    expect(opts.sameSite).toBe("lax");
  });

  it("respects user-provided secure flag", () => {
    expect(build_cookie_options({ secure: true }, 3600).secure).toBe(true);
    expect(build_cookie_options({ secure: false }, 3600).secure).toBe(false);
  });

  it("user options override defaults except httpOnly and maxAge", () => {
    const opts = build_cookie_options(
      { secure: true, sameSite: "strict", path: "/admin" },
      60
    );

    expect(opts.sameSite).toBe("strict");
    expect(opts.path).toBe("/admin");
    expect(opts.httpOnly).toBe(true);
    expect(opts.maxAge).toBe(60);
  });
});

describe("normalize_root_path", () => {
  it("ensures path starts with /", () => {
    expect(normalize_root_path("simplepass")).toBe("/simplepass");
  });

  it("removes trailing slash", () => {
    expect(normalize_root_path("/simplepass/")).toBe("/simplepass");
  });

  it("preserves root /", () => {
    expect(normalize_root_path("/")).toBe("/");
  });

  it("trims whitespace", () => {
    expect(normalize_root_path("  /simplepass  ")).toBe("/simplepass");
  });

  it("handles already correct path", () => {
    expect(normalize_root_path("/simplepass")).toBe("/simplepass");
  });
});

function mock_req(cookie_header?: string): Request {
  return {
    headers: { cookie: cookie_header }
  } as unknown as Request;
}

function mock_res(): Response & { _cookies: string[] } {
  const headers: Record<string, string | string[]> = {};

  const res = {
    _cookies: [] as string[],
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    setHeader(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;

      if (name.toLowerCase() === "set-cookie")
        res._cookies = Array.isArray(value) ? value : [value];
    }
  };

  return res as unknown as Response & { _cookies: string[] };
}
