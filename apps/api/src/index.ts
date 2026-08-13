import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { errorHandler } from "./http.js";
import { householdsRouter } from "./routes/households.js";
import { itemsRouter } from "./routes/items.js";
import { overviewRouter } from "./routes/overview.js";
import { tasksRouter } from "./routes/tasks.js";

const app = express();

// The frontend runs on a different port in development, so the browser needs
// permission to call this API. In production both are served from one origin.
app.use(cors());
// Bigger than Express's 100 kB default because member photos are sent inline
// as data URLs. The stricter per-field limit lives in schemas.ts.
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/households", householdsRouter);
app.use("/api", itemsRouter);
app.use("/api", tasksRouter);
app.use("/api", overviewRouter);

// An unknown /api path is a caller mistake, so answer in JSON. This has to sit
// above the static handler below, otherwise index.html would be sent instead.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// In production the built React app is served from this same server, which
// gives the browser a single origin. That is what lets apps/web/src/api.ts
// fetch("/api/...") with a relative URL and no CORS setup once deployed.
//
// In development this folder does not exist, because Vite serves the frontend
// on port 5173 and proxies /api back here.
const webDist = path.resolve(fileURLToPath(import.meta.url), "../../../web/dist");

if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));

  // React Router owns the URL. Any path that is not a real file gets the app
  // shell, so a hard refresh on /h/<id>/shopping loads rather than 404s.
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
  });
}

// Must be last: Express treats a 4-argument middleware as the error handler.
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`WG Buddy API listening on http://localhost:${port}`);
});
