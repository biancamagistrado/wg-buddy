import "dotenv/config";
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

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Must be last: Express treats a 4-argument middleware as the error handler.
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`WG Buddy API listening on http://localhost:${port}`);
});
