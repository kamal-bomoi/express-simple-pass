import type { SerializeOptions } from "cookie";
import type { Request } from "express";

export type PassType = "passkey" | "email-password";

export interface TokenPayload {
  v: 1;
  passed: true;
  iat: number;
}

export type Password = string | Record<number, string>;

export interface VerifyFnContext {
  req: Request;
}

export type PassKeyVerifyFn = (
  passkey: string,
  context: VerifyFnContext
) => boolean | Promise<boolean>;

export type EmailPasswordVerifyFn = (
  email: string,
  password: string,
  context: VerifyFnContext
) => boolean | Promise<boolean>;

export type VerifyFn<T extends PassType> = T extends "passkey"
  ? PassKeyVerifyFn
  : EmailPasswordVerifyFn;

export interface SimplePassOptions<T extends PassType> {
  /**
   * Authentication type.
   * - `"passkey"` — single shared password/key
   * - `"email-password"` — email + password pair
   */
  type: T;
  /**
   * Root path for the auth routes. Must start with `/`.
   * The authentication page will be served at this path.
   * @default "/simplepass"
   */
  rootpath?: `/${string}`;
  /**
   * Your verification function. Receives the credentials from the authentication form
   * and must return `true` if they are valid.
   */
  verify: VerifyFn<T>;
  /**
   * Cookie configuration.
   */
  cookie: SimplePassCookieOptions;
  /**
   * Theming and customization options.
   */
  theming?: SimplePassTheming;
}

export interface SimplePassTheming {
  /**
   * Browser tab title for the authentication page.
   */
  title?: string;
  /**
   * Custom font to load and apply on the authentication page.
   */
  font?: {
    /** A Google Fonts or any stylesheet URL to load the font from. */
    url: string;
    /** The font-family value to apply, e.g. `"Inter"` or `"Inter, sans-serif"` */
    family: string;
  };
  /**
   * Path to a custom CSS file (absolute path) or a raw CSS string
   * to inject into the authentication page.
   */
  css?: string;
  /**
   * Customize static text displayed on the authentication page.
   */
  labels?: SimplePassLabels;
}

/**
 * Cookie options without `encode` (not a valid Set-Cookie attribute)
 * and without `signed` (we handle integrity ourselves via iron-webcrypto).
 */
export type CookieOptions = Omit<SerializeOptions, "encode" | "signed">;

export interface SimplePassCookieOptions extends CookieOptions {
  /**
   * Secret used to encrypt and authenticate the session token.
   * Must be at least 32 characters.
   *
   * Supports password rotation: pass an object where the highest numeric
   * key is the current password. All passwords will be tried during unseal.
   *
   * @example "a-very-long-random-secret-at-least-32-chars"
   * @example { 1: "old-secret", 2: "new-secret" }
   */
  secret: Password;
  /**
   * How long (in seconds) the token is valid for.
   * Defaults to 12 hours.
   * @default 43200
   */
  ttl?: number;
  /**
   * Name of the authentication cookie.
   * @default "simplepass"
   */
  name?: string;
  /**
   * Whether to set the Secure flag on the cookie.
   * You must set this explicitly — there is no safe default.
   * Set to `true` in any environment served over HTTPS.
   * @see https://expressjs.com/en/guide/behind-proxies.html
   */
  secure: boolean;
}

export interface SimplePassLabels {
  /** Page heading. @default "Authentication" */
  title?: string;
  /** Subheading below the title. @default "Enter the pass key to continue" | "Enter your credentials to continue" */
  instruction?: string;
  /** Passkey input placeholder. Only applies to `"passkey"` type. @default "Pass key" */
  passkey_placeholder?: string;
  /** Email input placeholder. Only applies to `"email-password"` type. @default "Email" */
  email_placeholder?: string;
  /** Password input placeholder. Only applies to `"email-password"` type. @default "Password" */
  password_placeholder?: string;
  /** Submit button text. @default "Submit" */
  submit?: string;
  /** Log out button text. @default "Log out" */
  logout?: string;
  /** Message shown after logging out. @default "You have been logged out." */
  logged_out?: string;
  /** Error message shown when attempting to log out without being authenticated. @default "Not authorized." */
  unauthorized?: string;
  /** Error shown when attempting to authenticate while already authenticated. @default "You are already authenticated." */
  already_authenticated?: string;
}
