import { SimplePass } from "../src/index.js";
import express from "express";

const app = express();

const v2 = new SimplePass({
  type: "passkey",
  verify(passkey) {
    return passkey === "kamal";
  },
  cookie: {
    secret: "5HViWb0MLQmp392vMfuFdw0vXInmrwOo",
    secure: false,
    name: "__simplepass__"
  },
  theming: {
    labels: {},
    font: {
      url: "https://fonts.googleapis.com/css2?family=Finlandica&display=swap",
      family: `"Finlandica", sans-serif`
    }
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(v2.router());

app.get("/", (_req, res) => {
  res.send("/");
});

app.get("/passed", v2.guard, (_req, res) => {
  res.send("passed");
});

app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    res.status(500).json({ error: error.message });
  }
);

const port = "8000";

app.listen(+port, () => {
  console.log(`🚀 http://localhost:${port}`);
});
