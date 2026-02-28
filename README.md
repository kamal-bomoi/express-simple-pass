# express-simple-pass

An Express middleware for protecting admin UIs and dashboards with a simple password gate. Perfect for securing monitoring tools, admin panels, and internal dashboards without implementing a full authentication system.

## Requirements

- Express 5 or above
- Node.js 18 or above

## Installation

```bash
npm install express-simple-pass
# or
yarn add express-simple-pass
# or
pnpm add express-simple-pass
```

## ESM Only

This package is ESM only

## Basic Example

```typescript
import express from "express";
import { SimplePass } from "express-simple-pass";
import Agendash from "agendash";
import agenda from "./agenda-instance";
import argon2 from "argon2";

const app = express();

const simplepass = new SimplePass({
  type: "passkey",
  verify: (passkey) => argon2.verify(process.env.PASS_KEY_HASH, passkey),
  cookie: {
    secret: process.env.COOKIE_SECRET,
    secure: process.env.NODE_ENV === "production"
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(simplepass.router());

app.use("/admin/agendash", simplepass.guard, Agendash(agenda));

app.listen(3000);
```

## Authentication Types

### Passkey

A single shared secret.

```typescript
const simplepass = new SimplePass({
  type: "passkey",
  verify: (passkey) => argon2.verify(process.env.PASS_KEY_HASH, passkey),
  cookie: {
    secret: process.env.COOKIE_SECRET,
    secure: process.env.NODE_ENV === "production"
  }
});
```

### Email and Password

```typescript
const simplepass = new SimplePass({
  type: "email-password",
  verify: async (email, password) => {
    const admin = await db.users.findOne({ email, role: "admin" });

    return admin ? await argon2.verify(admin.password_hash, password) : false;
  },
  cookie: {
    secret: process.env.COOKIE_SECRET,
    secure: process.env.NODE_ENV === "production"
  }
});
```

## Protecting Routes

Use `simplepass.guard` as middleware on any route or group of routes. Unauthenticated requests are redirected to the authentication page and returned to their original destination after login.

```typescript
app.use("/admin", simplepass.guard, admin_router);
```

## Checking Authentication Programmatically

```typescript
const authenticated = await simplepass.passed(req);
```

Returns `true` if the request carries a valid, non-expired token.

## API

### `new SimplePass(options)`

| Option     | Type                            | Required | Description                                         |
| ---------- | ------------------------------- | -------- | --------------------------------------------------- |
| `type`     | `"passkey" \| "email-password"` | Yes      | Authentication type                                 |
| `verify`   | `VerifyFn`                      | Yes      | Credential verification function                    |
| `cookie`   | `SimplePassCookieOptions`       | Yes      | Cookie configuration                                |
| `rootpath` | `` `/${string}` ``              | No       | Root path for auth routes. Default: `"/simplepass"` |
| `theming`  | `SimplePassTheming`             | No       | Theming and customization options                   |

### `SimplePassCookieOptions`

| Option   | Type                               | Required | Description                                            |
| -------- | ---------------------------------- | -------- | ------------------------------------------------------ |
| `secret` | `string \| Record<number, string>` | Yes      | Encryption secret, minimum 32 characters               |
| `secure` | `boolean`                          | Yes      | Whether to set the `Secure` flag on the cookie         |
| `ttl`    | `number`                           | No       | Token lifetime in seconds. Default: `43200` (12 hours) |
| `name`   | `string`                           | No       | Cookie name. Default: `"simplepass"`                   |

All standard cookie `SerializeOptions` are also accepted (e.g. `domain`, `sameSite`, `path`).

### `simplepass.router()`

Returns an Express router that serves the authentication page and handles form submissions. Must be mounted on your app before any protected routes.

### `simplepass.guard`

Express middleware that protects a route. Redirects unauthenticated requests to the authentication page, preserving the original URL for post-login redirect.

### `simplepass.passed(req)`

Async method that returns `true` if the request is authenticated.

## The `verify` Function

The verify function receives the submitted credentials and must return `true` if they are valid. It also receives a context object containing the raw Express request, which can be used for rate limiting, IP checks, or logging.

### Passkey

```typescript
verify: (passkey: string, context: { req: Request }) =>
  boolean | Promise<boolean>;
```

### Email and Password

```typescript
verify: (email: string, password: string, context: { req: Request }) =>
  boolean | Promise<boolean>;
```

## Cookie Security

### The `secure` option

The `secure` option controls whether the `Secure` flag is set on the authentication cookie. There is no default — you must set it explicitly.

Set `secure: true` in any environment served over HTTPS. Set `secure: false` only in local development.

```typescript
cookie: {
  secret: process.env.COOKIE_SECRET,
  secure: process.env.NODE_ENV === "production",
}
```

Note: if your app runs behind a reverse proxy (nginx, Caddy, AWS ALB, etc.) and you rely on `req.secure`, make sure to set `app.set("trust proxy", true)` in Express. See the [Express behind proxies guide](https://expressjs.com/en/guide/behind-proxies.html) for details.

### The `secret` option

The cookie secret is used to encrypt and authenticate the session token via [iron-webcrypto](https://github.com/nicolo-ribaudo/iron-webcrypto). It must be at least 32 characters long.

Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Password Rotation

To rotate your secret without invalidating all active sessions, pass a map of numbered passwords. The highest numeric key is used to seal new tokens. All passwords are tried during verification.

```typescript
cookie: {
  secret: {
    1: process.env.OLD_COOKIE_SECRET,
    2: process.env.NEW_COOKIE_SECRET,
  },
  secure: true
}
```

Once enough time has passed for old tokens to have expired, remove the old password from the map.

---

# Customization

```typescript
const simplepass = new SimplePass({
  type: "passkey",
  verify: (passkey) => argon2.verify(process.env.PASS_KEY_HASH, passkey),
  cookie: {
    secret: process.env.COOKIE_SECRET,
    secure: true
  },
  theming: {
    font: {
      url: "https://fonts.googleapis.com/css2?family=Inter&display=swap",
      family: "Inter, sans-serif"
    },
    css: "/absolute/path/to/your/styles.css",
    labels: {
      title: "Admin Access",
      instruction: "Enter the passkey to continue",
      submit: "Continue",
      logout: "Sign out",
      logged_out: "You have been signed out."
    }
  }
});
```

## Labels

Customize all static text on the authentication page via `theming.labels`:

```typescript
theming: {
  labels: {
    title: "Admin Access",
    instruction: "Enter your credentials to continue",
    email_placeholder: "Email",
    password_placeholder: "Password",
    passkey_placeholder: "Pass key",
    submit: "Continue",
    logout: "Sign out",
    logged_out: "You have been signed out.",
    unauthorized: "Not authorized.",
    already_authenticated: "You are already authenticated.",
  }
}
```

| Label                   | Description                                                 | Default (`passkey`)                | Default (`email-password`)             |
| ----------------------- | ----------------------------------------------------------- | ---------------------------------- | -------------------------------------- |
| `title`                 | Page heading                                                | `"Authentication"`                 | `"Authentication"`                     |
| `instruction`           | Subheading below title                                      | `"Enter the pass key to continue"` | `"Enter your credentials to continue"` |
| `passkey_placeholder`   | Passkey input placeholder                                   | `"Pass key"`                       | —                                      |
| `email_placeholder`     | Email input placeholder                                     | —                                  | `"Email"`                              |
| `password_placeholder`  | Password input placeholder                                  | —                                  | `"Password"`                           |
| `submit`                | Submit button text                                          | `"Submit"`                         | `"Submit"`                             |
| `logout`                | Log out button text                                         | `"Log out"`                        | `"Log out"`                            |
| `logged_out`            | Message shown after logging out                             | `"You have been logged out."`      | `"You have been logged out."`          |
| `unauthorized`          | Error shown when logging out without being authenticated    | `"Not authorized."`                | `"Not authorized."`                    |
| `already_authenticated` | Error shown when authenticating while already authenticated | `"You are already authenticated."` | `"You are already authenticated."`     |

## Font

Load and apply a custom font via `theming.font`:

```typescript
theming: {
  font: {
    url: "https://fonts.googleapis.com/css2?family=Inter&display=swap",
    family: "Inter, sans-serif",
  }
}
```

| Property | Description                                                               |
| -------- | ------------------------------------------------------------------------- |
| `url`    | A Google Fonts or any stylesheet URL to load the font from                |
| `family` | The `font-family` value to apply, e.g. `"Inter"` or `"Inter, sans-serif"` |

## Styling

The authentication page is dark themed by default. There are two levels of customization available: CSS variables for quick theming, and direct class or element targeting for full control.

### Providing custom CSS

Pass either an absolute path to a `.css` file or a raw CSS string via `theming.css`.

```typescript
theming: {
  css: "/absolute/path/to/your/styles.css",
}
```

Or inline:

```typescript
theming: {
  css: `
    :root {
      --sp-bg: #ffffff;
      --sp-surface: #f9f9f9;
      --sp-text: #09090b;
    }
  `,
}
```

### CSS variables

The quickest way to retheme the page is to override the `--sp-*` CSS custom properties. Overriding variables at `:root` cascades through every rule automatically.

```css
:root {
  /* Backgrounds */
  --sp-bg: #09090b; /* Page background */
  --sp-surface: #111113; /* Card background */

  /* Borders */
  --sp-border: #27272a; /* Default border color */
  --sp-border-focus: #52525b; /* Input border on focus */

  /* Text */
  --sp-text: #fafafa; /* Primary text */
  --sp-text-muted: #a1a1aa; /* Instruction text, log out button */
  --sp-text-placeholder: #52525b; /* Input placeholder text */

  /* Button */
  --sp-btn-bg: #fafafa; /* Submit button background */
  --sp-btn-bg-hover: #e4e4e7; /* Submit button hover */
  --sp-btn-bg-active: #d4d4d8; /* Submit button active/pressed */
  --sp-btn-text: #09090b; /* Submit button text */

  /* Alerts */
  --sp-error: #f87171; /* Error text */
  --sp-error-bg: #1c0a0a; /* Error background */
  --sp-error-border: #7f1d1d; /* Error border */
  --sp-success: #34d399; /* Success text */
  --sp-success-bg: #022c22; /* Success background */
  --sp-success-border: #064e3b; /* Success border */

  /* Misc */
  --sp-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --sp-radius: 0.5rem; /* Border radius applied throughout */
  --sp-shadow: 0 0 0 1px #27272a; /* Card shadow */
  --sp-input-height: 2.5rem; /* Height of inputs and submit button */
  --sp-gap: 20px; /* Spacing between sections */
}
```

#### Example: light theme

```css
:root {
  --sp-bg: #ffffff;
  --sp-surface: #fafafa;
  --sp-border: #e4e4e7;
  --sp-border-focus: #a1a1aa;
  --sp-text: #09090b;
  --sp-text-muted: #71717a;
  --sp-text-placeholder: #a1a1aa;
  --sp-btn-bg: #18181b;
  --sp-btn-bg-hover: #27272a;
  --sp-btn-bg-active: #09090b;
  --sp-btn-text: #fafafa;
  --sp-error: #dc2626;
  --sp-error-bg: #fef2f2;
  --sp-error-border: #fecaca;
  --sp-success: #16a34a;
  --sp-success-bg: #f0fdf4;
  --sp-success-border: #bbf7d0;
  --sp-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.07);
}
```

### CSS classes and IDs

Every element on the page has a stable class or ID you can target directly.

#### Layout

| Selector        | Element                                                               |
| --------------- | --------------------------------------------------------------------- |
| `body`          | Page body — controls background and centering                         |
| `.container`    | The card wrapping the entire form                                     |
| `.header`       | Wrapper around title and instruction                                  |
| `.fields`       | Wrapper around all inputs                                             |
| `.fields-group` | Wrapper around email and password inputs (`email-password` type only) |
| `.actions`      | Wrapper around the submit button                                      |
| `.logout-form`  | The log out form                                                      |

#### Elements

| Selector        | Element                        |
| --------------- | ------------------------------ |
| `.title`        | The page heading               |
| `.instruction`  | The subheading below the title |
| `.input`        | All input fields               |
| `#email`        | Email input specifically       |
| `#password`     | Password input specifically    |
| `#passkey`      | Passkey input specifically     |
| `form button`   | Submit button                  |
| `button.logout` | Log out button                 |

#### Alerts

| Selector         | Element                                  |
| ---------------- | ---------------------------------------- |
| `.alert`         | Alert container (both error and success) |
| `.alert.error`   | Error alert                              |
| `.alert.success` | Success alert                            |
