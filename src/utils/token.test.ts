import { describe, it, expect } from "vitest";
import { assert_password_strength, seal_token, verify_token } from "./token.js";
import * as Iron from "iron-webcrypto";

const SECRET = "a-very-long-secure-secret-for-testing-purposes";
const TTL = 3600;

describe("assert_password_strength", () => {
  it("throws if string secret is shorter than 32 characters", () => {
    expect(() => assert_password_strength("tooshort")).toThrow(
      "at least 32 characters"
    );
  });

  it("accepts a string secret of exactly 32 characters", () => {
    expect(() => assert_password_strength("a".repeat(32))).not.toThrow();
  });

  it("throws if secret map is empty", () => {
    expect(() => assert_password_strength({})).toThrow("at least one entry");
  });

  it("throws if any secret in the map is shorter than 32 characters", () => {
    expect(() =>
      assert_password_strength({ 1: "a".repeat(32), 2: "tooshort" })
    ).toThrow("at least 32 characters");
  });

  it("accepts a valid secret map", () => {
    expect(() =>
      assert_password_strength({ 1: "a".repeat(32), 2: "b".repeat(32) })
    ).not.toThrow();
  });
});

describe("lifecycle", () => {
  it("seals and verifies a token", async () => {
    const token = await seal_token(SECRET, TTL);
    const payload = await verify_token({ token, secret: SECRET, ttl: TTL });

    expect(payload).not.toBeNull();
    expect(payload?.v).toBe(1);
    expect(payload?.passed).toBe(true);
    expect(typeof payload?.iat).toBe("number");
  });

  it("returns null for a tampered token", async () => {
    const token = await seal_token(SECRET, TTL);
    const tampered = token.slice(0, -5) + "XXXXX";
    const payload = await verify_token({
      token: tampered,
      secret: SECRET,
      ttl: TTL
    });

    expect(payload).toBeNull();
  });

  it("returns null for a token sealed with a different secret", async () => {
    const token = await seal_token(SECRET, TTL);
    const payload = await verify_token({
      token,
      secret: "z".repeat(32) + "different-secret-here",
      ttl: TTL
    });

    expect(payload).toBeNull();
  });

  it("returns null for a sealed payload that fails shape validation", async () => {
    const token = await Iron.seal(
      { not: "a token" },
      { id: "1", secret: SECRET },
      { ...Iron.defaults, ttl: TTL * 1000 }
    );
    const payload = await verify_token({ token, secret: SECRET, ttl: TTL });

    expect(payload).toBeNull();
  });

  it("returns null for a completely invalid string", async () => {
    const payload = await verify_token({
      token: "not.a.valid.token",
      secret: SECRET,
      ttl: TTL
    });

    expect(payload).toBeNull();
  });

  it("supports password rotation — verifies with old password", async () => {
    const old_secret = "a".repeat(32) + "-old";
    const new_secret = "b".repeat(32) + "-new";
    const token = await seal_token(old_secret, TTL);
    const payload = await verify_token({
      token,
      secret: { 1: old_secret, 2: new_secret },
      ttl: TTL
    });

    expect(payload).not.toBeNull();
  });

  it("seals new tokens with the newest password in rotation map", async () => {
    const old_secret = "a".repeat(32) + "-old";
    const new_secret = "b".repeat(32) + "-new";
    const token = await seal_token({ 1: old_secret, 2: new_secret }, TTL);
    const with_old = await verify_token({
      token,
      secret: old_secret,
      ttl: TTL
    });

    expect(with_old).toBeNull();

    const with_map = await verify_token({
      token,
      secret: { 1: old_secret, 2: new_secret },
      ttl: TTL
    });
    expect(with_map).not.toBeNull();
  });
});
