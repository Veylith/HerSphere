import { createServer as createHttpServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DataStore } from "./infrastructure/dataStore.js";
import { createLogger } from "./infrastructure/logger.js";
import { createRouter } from "./http/router.js";
import { serveStatic } from "./http/response.js";
import { registerRoutes } from "./http/routes.js";
import { assertProductionSecrets, loadEnv } from "./config/env.js";
import { createRateLimiter } from "./security/rateLimiter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");

export async function createApp(options = {}) {
  const env = { ...loadEnv(rootDir), ...options.env };
  assertProductionSecrets(env);

  const logger = options.logger || createLogger();
  const dataFile = env.dataFile || resolve(rootDir, "apps/backend/data/store.json");
  const staticRoot = env.staticRoot || resolve(rootDir, "apps/frontend");
  const store = options.store || new DataStore(dataFile);
  store.init();

  const router = createRouter({ env, store, logger });
  registerRoutes(router);
  const rateLimit = createRateLimiter({ windowMs: env.rateLimitWindowMs, max: env.rateLimitMax });

  const server = createHttpServer(async (req, res) => {
    const ip = req.socket.remoteAddress || "unknown";
    try {
      rateLimit(`${ip}:${req.url}`);
      if (req.url?.startsWith("/api/")) {
        await router.handle(req, res);
        return;
      }
      if (!serveStatic(req, res, staticRoot)) {
        res.writeHead(404);
        res.end("Not found");
      }
    } catch (error) {
      logger.error({ error: error.stack || error.message });
      res.writeHead(error.status || 500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: { message: error.message || "Internal server error" } }));
    }
  });

  return { server, env, store };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server, env } = await createApp();
  server.listen(env.port, () => {
    console.log(`HerSphere API running at http://localhost:${env.port}`);
  });
}
