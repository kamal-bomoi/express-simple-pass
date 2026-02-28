import type { PassType, SimplePassLabels, SimplePassTheming } from "./types.js";
import type {
  CookieOptions,
  EmailPasswordVerifyFn,
  PassKeyVerifyFn,
  SimplePassOptions
} from "./types.js";
import {
  build_cookie_options,
  clear_cookie,
  normalize_root_path,
  read_cookie,
  write_cookie
} from "./utils/cookie.js";
import express from "express";
import pug from "pug";
import {
  DEFAULT_COOKIE_NAME,
  DEFAULT_ROOTPATH,
  DEFAULT_TTL,
  FLASH_COOKIE_NAME,
  VIEWS_DIR
} from "./utils/constants.js";
import { inlinify, safe_redirect, view } from "./utils/common.js";
import {
  assert_password_strength,
  seal_token,
  verify_token
} from "./utils/token.js";

export class SimplePass<T extends PassType> {
  readonly #base_cookie_options: CookieOptions;
  readonly #cookie_name: string;
  readonly #type: T;
  readonly #rootpath: string;
  readonly #verify: SimplePassOptions<T>["verify"];
  readonly #css: SimplePassTheming["css"];
  readonly #secret: SimplePassOptions<T>["cookie"]["secret"];
  readonly #ttl: number;
  readonly #labels: SimplePassLabels;
  readonly #font: SimplePassTheming["font"];

  constructor(options: SimplePassOptions<T>) {
    const {
      secret,
      name = DEFAULT_COOKIE_NAME,
      ttl = DEFAULT_TTL,
      ...cookie_options
    } = options.cookie;

    assert_password_strength(secret);

    this.#base_cookie_options = cookie_options;
    this.#cookie_name = name;
    this.#type = options.type;
    this.#verify = options.verify;
    this.#secret = secret;
    this.#ttl = ttl;
    this.#labels = options.theming?.labels ?? {};
    this.#font = options.theming?.font;
    this.#rootpath = options.rootpath
      ? normalize_root_path(options.rootpath)
      : DEFAULT_ROOTPATH;

    if (options.theming?.css) this.#css = inlinify(options.theming.css);
  }

  async passed(req: express.Request): Promise<boolean> {
    const token = read_cookie(req, this.#cookie_name);

    if (!token) return false;

    const payload = await verify_token({
      token,
      secret: this.#secret,
      ttl: this.#ttl
    });

    return payload !== null;
  }

  guard = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): Promise<void> => {
    if (await this.passed(req)) return next();

    const redirect = encodeURIComponent(req.originalUrl);

    res.redirect(`${this.#rootpath}?redirect=${redirect}`);
  };

  router(): express.Router {
    const router = express.Router();

    router.get(this.#rootpath, this.#authenticate_view);
    router.post(this.#rootpath, this.#authenticate);
    router.post(`${this.#rootpath}/_logout`, this.#logout);

    router.use(
      (
        error: Error,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        this.#render(res, {
          error: error.message
        });
      }
    );

    return router;
  }

  #authenticate_view = (req: express.Request, res: express.Response): void => {
    const flash = read_cookie(req, FLASH_COOKIE_NAME);

    if (flash)
      clear_cookie({
        res,
        name: FLASH_COOKIE_NAME,
        options: { path: "/", httpOnly: true, maxAge: 0 }
      });

    this.#render(res, {
      unpassed: flash === "unpassed",
      redirect:
        typeof req.query.redirect === "string" ? req.query.redirect : undefined
    });
  };

  #authenticate = async (
    req: express.Request,
    res: express.Response
  ): Promise<void> => {
    const redirect = safe_redirect(req.query.redirect, "/");

    if (await this.passed(req))
      throw new Error(
        this.#labels.already_authenticated ?? "You are already authenticated."
      );

    try {
      if (this.#type === "passkey") await this.#verify_passkey(req);
      else if (this.#type === "email-password")
        await this.#verify_credentials(req);
      else throw new Error("Invalid pass type.");

      const token = await seal_token(this.#secret, this.#ttl);

      write_cookie({
        name: this.#cookie_name,
        res,
        value: token,
        options: build_cookie_options(this.#base_cookie_options, this.#ttl)
      });

      res.redirect(redirect);
    } catch (e) {
      res.status(401);

      const body = req.body as Record<string, unknown>;
      const email = typeof body.email === "string" ? body.email : undefined;

      this.#render(res, {
        redirect,
        error: e instanceof Error ? e.message : JSON.stringify(e),
        email: this.#type === "email-password" ? email : undefined
      });
    }
  };

  #logout = async (
    req: express.Request,
    res: express.Response
  ): Promise<void> => {
    if (!(await this.passed(req)))
      throw new Error(this.#labels.unauthorized ?? "Not authorized.");

    clear_cookie({
      res,
      name: this.#cookie_name,
      options: build_cookie_options(this.#base_cookie_options, 0)
    });

    write_cookie({
      res,
      name: FLASH_COOKIE_NAME,
      value: "unpassed",
      options: { path: "/", httpOnly: true, maxAge: 10 }
    });

    res.redirect(this.#rootpath);
  };

  async #verify_passkey(req: express.Request): Promise<void> {
    const { passkey } = req.body as { passkey?: string };

    if (typeof passkey !== "string" || passkey.trim() === "")
      throw new Error("Passkey is required.");

    const fn = this.#verify as PassKeyVerifyFn;

    const verified = await fn(passkey, { req });

    if (!verified) throw new Error("Incorrect passkey.");
  }

  async #verify_credentials(req: express.Request): Promise<void> {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      email.trim() === "" ||
      password === ""
    )
      throw new Error("Email and password are required.");

    const fn = this.#verify as EmailPasswordVerifyFn;

    const verified = await fn(email, password, { req });

    if (!verified) throw new Error("Invalid credentials.");
  }

  #render(res: express.Response, locals: Record<string, any>): void {
    const html = pug.renderFile(view("pass"), {
      rootpath: this.#rootpath,
      type: this.#type,
      css: this.#css,
      labels: this.#labels,
      font: this.#font,
      ...locals,
      basedir: VIEWS_DIR
    });

    res.type("html").send(html);
  }
}
