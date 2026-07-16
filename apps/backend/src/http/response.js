import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { AppError } from "../domain/errors.js";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

export function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' http://localhost:4000 http://127.0.0.1:4000; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:;"
  );
}

export function sendJson(res, status, payload, extraHeaders = {}) {
  setSecurityHeaders(res);
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export function sendNoContent(res) {
  setSecurityHeaders(res);
  res.writeHead(204);
  res.end();
}

export function sendError(res, error, requestId) {
  const status = error instanceof AppError ? error.status : 500;
  const message = status === 500 ? "Internal server error" : error.message;
  sendJson(res, status, {
    error: {
      message,
      details: error.details,
      requestId
    }
  });
}

export function serveStatic(req, res, staticRoot) {
  const url = new URL(req.url, "http://localhost");
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const normalized = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(staticRoot, normalized);

  try {
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;
    const contentType = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    setSecurityHeaders(res);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(readFileSync(filePath));
    return true;
  } catch {
    if (!url.pathname.startsWith("/api/")) {
      const indexPath = join(staticRoot, "index.html");
      setSecurityHeaders(res);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(indexPath));
      return true;
    }
    return false;
  }
}
