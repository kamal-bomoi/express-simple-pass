import * as Iron from "iron-webcrypto";
import type { Password, TokenPayload } from "../types.js";
import { EXPECTED_ERROR_PATTERN } from "./constants.js";

type PasswordsMap = Record<string, string>;

const TOKEN_VERSION: TokenPayload["v"] = 1;

export async function seal_token(
  secret: string | Record<number, string>,
  ttl: number
): Promise<string> {
  const passwords_map = normalize_password(secret);

  const password = newest_password(passwords_map);

  const payload: TokenPayload = {
    v: TOKEN_VERSION,
    passed: true,
    iat: Math.floor(Date.now() / 1000)
  };

  const sealed = await Iron.seal(payload, password, {
    ...Iron.defaults,
    ttl: ttl * 1000
  });

  return sealed;
}

export async function verify_token({
  token,
  secret,
  ttl
}: {
  token: string;
  secret: Password;
  ttl: number;
}): Promise<TokenPayload | null> {
  const passwords_map = normalize_password(secret);

  try {
    const data = await Iron.unseal(token, passwords_map, {
      ...Iron.defaults,
      ttl: ttl * 1000
    });

    if (!is_token_payload(data)) return null;

    return data;
  } catch (e) {
    if (e instanceof Error && EXPECTED_ERROR_PATTERN.test(e.message))
      return null;

    throw e;
  }
}

export function assert_password_strength(secret: Password): void {
  if (typeof secret === "string" && secret.length < 32)
    throw new Error(
      "express-simple-pass: cookie.secret must be at least 32 characters long."
    );

  if (typeof secret === "object") {
    const values = Object.values(secret);

    if (values.length === 0)
      throw new Error(
        "express-simple-pass: cookie.secret map must have at least one entry."
      );

    if (values.some((v) => v.length < 32))
      throw new Error(
        "express-simple-pass: All secrets in cookie.secret map must be at least 32 characters long."
      );
  }
}

function normalize_password(
  secret: string | Record<number, string>
): PasswordsMap {
  if (typeof secret === "string") return { 1: secret };

  return Object.fromEntries(Object.entries(secret).map(([k, v]) => [k, v]));
}

function newest_password(map: PasswordsMap): {
  id: string;
  secret: string;
} {
  const keys = Object.keys(map);

  if (!keys.length)
    throw new Error("express-simple-pass: No passwords provided.");

  const id = Math.max(...keys.map(Number));

  return { id: String(id), secret: map[id]! };
}

function is_token_payload(data: unknown): data is TokenPayload {
  return (
    typeof data === "object" &&
    data !== null &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (data as TokenPayload).v === TOKEN_VERSION &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (data as TokenPayload).passed &&
    typeof (data as TokenPayload).iat === "number"
  );
}
