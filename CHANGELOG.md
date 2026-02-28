# Changelog

## [3.0.0]

Version 3 is a complete rewrite with a revamped authentication system, a redesigned API, and significant security improvements over previous version. See [MIGRATION.md](./MIGRATION.md) for a step-by-step upgrade guide.

### Security

Previous versions used `cookie-parser` with `req.signedCookies` to verify the authentication state. This approach had several weaknesses: it depended entirely on the host app having `cookie-parser` registered with the correct secret, it was vulnerable to conflicts with any other middleware that touched `req.signedCookies`, and the cookie value itself was only HMAC-signed.

Version 3 replaces this entirely. The authentication token is now encrypted and authenticated using [iron-webcrypto](https://github.com/brc-dd/iron-webcrypto). The token payload is fully opaque to the browser. Tampered, forged, or expired tokens are rejected during unsealing before any payload data is read.

Cookies are read directly from `req.headers.cookie` and written via `res.setHeader("Set-Cookie", ...)` with no dependency on `cookie-parser` or any other middleware. This eliminates the entire class of conflicts and misconfiguration issues that affected previous versions, and ensures the auth cookie is isolated from the host app's cookie handling regardless of how it is configured.

Additional security fixes included in this release:

- `httpOnly` is always enforced on the auth cookie and cannot be overridden
- The passkey and password fields are never echoed back to the form on failed authentication
- The `redirect` query parameter is validated to be a safe relative path, preventing open redirect attacks
- `cookie.secure` is now required — there is no silent default that could result in a non-Secure cookie being set in production

### Breaking Changes

- `simplepass.usepass(req, res, next)` renamed to `simplepass.guard`
- `SimplePass.passed(req)` is no longer static — call it as `simplepass.passed(req)`. It is also now async and returns `Promise<boolean>`
- `cookie.secret` no longer accepts `string[]`. Use a numbered object map for password rotation: `{ 1: "old", 2: "new" }`
- `cookie.secret` is validated at construction time — a secret shorter than 32 characters throws immediately
- `cookie.secure` is now required. There is no default
- `css`, `title`, and `labels` have moved under a new `theming` option
- `labels.unpass` renamed to `theming.labels.logout`
- `labels.unpassed` renamed to `theming.labels.logged_out`
- The logout route has changed from `GET /<rootpath>/un` to `POST /<rootpath>/_logout`
- The logout button is now a form submit button rather than an anchor tag
- `express.urlencoded` must be registered on your app manually before mounting `simplepass.router()`
- Express 5 or above is now required
- All existing v2 cookies are invalid after upgrading — users will need to re-authenticate once

### New Features

- `theming.font` — load and apply a custom font via a stylesheet URL and font-family value
- `theming.labels.unauthorized` — customize the error shown when logging out without being authenticated
- `theming.labels.already_authenticated` — customize the error shown when authenticating while already authenticated
- `cookie.name` — customize the authentication cookie name. Default: `"simplepass"`
- Password rotation via numbered secret map — new tokens are sealed with the newest password, all passwords are tried during verification
- The `verify` function now receives a context object containing the raw Express `req` as its last argument, useful for rate limiting, IP checks, or logging
- Dark themed login page by default with full CSS variable theming system
- Flash cookie based logout success message — the URL stays clean after logout
- CSS custom properties (`--sp-*`) for quick theming without touching individual selectors

---

## [2.2.1]

Last stable release of the v2 API.
