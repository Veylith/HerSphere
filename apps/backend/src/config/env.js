import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

export function loadEnv(rootDir = process.cwd()) {
  const fileEnv = parseDotEnv(resolve(rootDir, ".env"));
  const env = { ...fileEnv, ...process.env };

  return {
    nodeEnv: env.NODE_ENV || "development",
    port: Number(env.PORT || 4000),
    frontendPort: Number(env.FRONTEND_PORT || 5173),
    jwtSecret: env.JWT_SECRET || "dev-only-change-me-in-production",
    csrfSecret: env.CSRF_SECRET || "dev-only-csrf-secret",
    tokenTtlSeconds: Number(env.TOKEN_TTL_SECONDS || 60 * 60 * 8),
    corsOrigins: String(
      env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    dataFile: env.DATA_FILE,
    staticRoot: env.STATIC_ROOT,
    maxBodyBytes: Number(env.MAX_BODY_BYTES || 1024 * 1024),
    rateLimitWindowMs: Number(env.RATE_LIMIT_WINDOW_MS || 60_000),
    rateLimitMax: Number(env.RATE_LIMIT_MAX || 140)
  };
}

export function assertProductionSecrets(env) {
  if (env.nodeEnv !== "production") return;
  const unsafe = ["dev-only-change-me-in-production", "dev-only-csrf-secret"];
  if (unsafe.includes(env.jwtSecret) || unsafe.includes(env.csrfSecret)) {
    throw new Error("Production requires strong JWT_SECRET and CSRF_SECRET values.");
  }
}
