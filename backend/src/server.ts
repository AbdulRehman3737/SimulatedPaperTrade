import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";

dotenv.config();

import { botManager } from "./services/botManager";
import { createBotRoutes } from "./routes/bot";
import { createInstanceRoutes } from "./routes/instances";
import { createPortfolioRoutes } from "./routes/portfolio";
import { createSettingsRoutes } from "./routes/settings";
import { createTradesRoutes } from "./routes/trades";
import marketRoutes from "./routes/market";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const corsOrigins = process.env.CORS_ORIGIN?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/instances", createInstanceRoutes(botManager));
app.use("/api/instances/:instanceId/bot", createBotRoutes(botManager));
app.use("/api/instances/:instanceId/settings", createSettingsRoutes(botManager));
app.use("/api/instances/:instanceId/portfolio", createPortfolioRoutes(botManager));
app.use("/api/instances/:instanceId/trades", createTradesRoutes(botManager));
app.use("/api/market", marketRoutes);

// Optionally serve the built frontend so a single process can run the whole
// app on one Droplet. Only kicks in when frontend/dist exists next to this
// project (e.g. after `npm run build` in frontend/); local dev still uses
// the Vite dev server instead.
const frontendDistPath = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[server] Unhandled error: ${err.message}`);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Crypto paper trading backend listening on port ${PORT}`);

  if (process.env.BOT_AUTOSTART !== "false") {
    botManager.startAll();
    console.log(`All bot instances auto-started.`);
  }
});

export default app;
