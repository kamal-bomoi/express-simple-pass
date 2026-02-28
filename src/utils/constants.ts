import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_COOKIE_NAME = "simplepass";
export const FLASH_COOKIE_NAME = "simplepass.flash";
export const DEFAULT_TTL: number = 12 * 60 * 60;
export const DEFAULT_ROOTPATH = "/simplepass";

export const DIST_DIR: string = path.dirname(fileURLToPath(import.meta.url));

export const VIEWS_DIR: string = path.join(DIST_DIR, "..", "views");

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
export const EXPECTED_ERROR_PATTERN: RegExp =
  /^(Expired seal|Bad hmac value|Cannot find password|Incorrect number of sealed components|Wrong mac prefix|Invalid expiration|Failed parsing sealed object JSON)/;
