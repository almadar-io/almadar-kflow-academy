// Load and validate environment variables BEFORE importing @almadar/server,
// which reads FIREBASE_* env vars at module initialization.
import './config/env.js';

// Initialize Firebase *immediately* via dynamic import, before any other
// static imports that might transitively pull in @almadar/server or
// @almadar-io/knowledge code that calls getFirestore at runtime.
// This prevents "Firebase Admin SDK is not initialized" errors in request
// handlers (e.g. old listGraphs -> upsertUser -> StudentProfileService).
const { initializeFirebase, createLogger, setupEventBroadcast } = await import("@almadar/server");
initializeFirebase();

import app, { initApp } from "./app";
import { config, validateEnv } from './config/env.js';

const logger = createLogger("kflow:server");

validateEnv();

await initApp();

const server = app.listen(config.port, () => {
  logger.info(`KFlow server running on port ${config.port}`);
  logger.info(`OpenAI: ${config.openaiApiKey ? "Enabled" : "Disabled"}`);
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
