import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configfile = process.env.NODE_ENV?.trim() === "development" ? ".env.development" : ".env";
config({ path: path.resolve(__dirname, "..", configfile) });

// Map kflow FB_* vars to FIREBASE_* before any @almadar/server Firebase calls
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

import { createLogger, setupEventBroadcast } from "@almadar/server";
import app, { initApp } from "./app";

const logger = createLogger("kflow:server");

const port: number = parseInt(process.env.PORT || "3001", 10);

await initApp();

const server = app.listen(port, () => {
  logger.info(`KFlow server running on port ${port}`);
  logger.info(`OpenAI: ${process.env.OPENAI_API_KEY ? "Enabled" : "Disabled"}`);
  setupEventBroadcast(server, '/ws/events');
  logger.info('WS event broadcast ready at /ws/events');
});

const connections = new Set<import("net").Socket>();
server.on("connection", (conn) => {
  connections.add(conn);
  conn.on("close", () => connections.delete(conn));
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down...`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    for (const conn of connections) conn.destroy();
  }, 100);
  setTimeout(() => process.exit(0), 2000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  shutdown("uncaughtException");
});
