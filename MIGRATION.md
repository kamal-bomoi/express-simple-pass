# Migration from v2 to v3

Version 3 is a complete rewrite. The steps below cover every breaking change in order of what you are most likely to encounter first.

> All existing v2 cookies are invalid after upgrading.

---

## 1. Install v3

```bash
npm install express-simple-pass@3
```

---

## 2. Register `express.urlencoded`

v3 no longer registers body parsing internally. You must add `express.urlencoded` to your app before mounting the router.

```typescript
// v2
app.use(simplepass.router());

// v3
app.use(express.urlencoded({ extended: true }));
app.use(simplepass.router());
```

---

## 3. Rename `usepass` to `guard`

```typescript
// v2
app.use(
  "/admin",
  (req, res, next) => simplepass.usepass(req, res, next),
  admin_router
);

// v3
app.use("/admin", simplepass.guard, admin_router);
```

---

## 4. Update `passed()`

`passed` is no longer a static method and is now async:

```typescript
// v2
const authenticated = SimplePass.passed(req); // static, synchronous

// v3
const authenticated = await simplepass.passed(req); // instance, async
```

---

## 5. Add `cookie.secure`

`secure` is now a required field on the cookie options. There is no default.

```typescript
// v2
cookie: {
  secret: "my-secret"
}

// v3
cookie: {
  secret: process.env.COOKIE_SECRET!,
  secure: process.env.NODE_ENV === "production",
}
```

If your app runs behind a reverse proxy, read the [cookie security](./README.md#cookie-security) section in the README before deciding what value to use.

---

## 6. Update the cookie secret

v2 accepted any string or `string[]` as the secret with no minimum length requirement. v3 requires a single string of at least 32 characters, or a numbered rotation map.

```typescript
// v2
cookie: {
  secret: "superduperlongsecuresecret"
}

// v3 — single secret
cookie: {
  secret: process.env.COOKIE_SECRET, // must be at least 32 characters
  secure: process.env.NODE_ENV === "production",
}
```

To generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 7. Move `css`, `title`, and `labels` under `theming`

```typescript
// v2
const simplepass = new SimplePass({
  type: "passkey",
  verify: ...,
  cookie: { secret: "..." },
  css: "/path/to/styles.css",
  title: "Admin Access",
  labels: {
    title: "Admin Access",
    instruction: "Enter the passkey",
    unpass: "Sign out",
    unpassed: "Signed out.",
  },
});

// v3
const simplepass = new SimplePass({
  type: "passkey",
  verify: ...,
  cookie: { secret: "...", secure: true },
  theming: {
    css: "/path/to/styles.css",
    labels: {
      title: "Admin Access",
      instruction: "Enter the passkey",
      logout: "Sign out",        // was: unpass
      logged_out: "Signed out.", // was: unpassed
    },
  },
});
```

---

## 8. Update the logout form action

If you have any custom HTML or client-side code that submits to the logout route, update the path:

```
// v2
GET /<rootpath>/un

// v3
POST /<rootpath>/_logout
```

---

## 9. Update CSS selectors

If you have custom CSS targeting the logout button or alert messages, update your selectors:

```css
/* v2 */
.unpass {
}
.message.error {
}
.message.success {
}

/* v3 */
button.logout {
}
.alert.error {
}
.alert.success {
}
```

For a full reference of available selectors in v3, see the [CSS classes and IDs](./README.md#css-classes-and-ids) section in the README.
