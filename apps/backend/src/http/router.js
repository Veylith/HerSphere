import { randomUUID } from "node:crypto";
import { sendError, sendJson } from "./response.js";
import { badRequest, forbidden, unauthorized } from "../domain/errors.js";
import { verifyCsrfToken, verifyToken } from "../security/token.js";

function compilePath(pattern) {
  const names = [];
  const source = pattern
    .split("/")
    .map((part) => {
      if (part.startsWith(":")) {
        names.push(part.slice(1));
        return "([^/]+)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { regex: new RegExp(`^${source}$`), names };
}

export function createRouter({ env, store, logger }) {
  const routes = [];

  function add(method, pattern, handler, options = {}) {
    routes.push({ method, pattern, handler, options, compiled: compilePath(pattern) });
  }

  async function parseBody(req) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return {};
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > env.maxBodyBytes) throw badRequest("Request body is too large");
      chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw badRequest("Request body must be valid JSON");
    }
  }

  function getUser(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const payload = verifyToken(token, env.jwtSecret);
    if (!payload?.sub) return null;
    const user = store.findById("users", payload.sub);
    if (!user || user.status === "disabled") return null;
    return user;
  }

  function assertOrigin(req) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return;
    const origin = req.headers.origin;
    if (origin && !env.corsOrigins.includes(origin)) {
      throw forbidden("Origin is not allowed");
    }
    const csrf = req.headers["x-csrf-token"];
    if (!verifyCsrfToken(csrf, env.csrfSecret)) {
      throw forbidden("CSRF token is missing or invalid");
    }
  }

  async function handle(req, res) {
    const requestId = randomUUID();
    const origin = req.headers.origin;
    if (origin && env.corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url, "http://localhost");
      const route = routes.find((candidate) => {
        if (candidate.method !== req.method) return false;
        return candidate.compiled.regex.test(url.pathname);
      });

      if (!route) {
        sendJson(res, 404, { error: { message: "API route not found", requestId } });
        return;
      }

      assertOrigin(req);
      const match = url.pathname.match(route.compiled.regex);
      const params = Object.fromEntries(route.compiled.names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
      const body = await parseBody(req);
      const user = getUser(req);

      if (route.options.auth && !user) {
        throw unauthorized();
      }
      if (route.options.roles?.length && !route.options.roles.includes(user?.role)) {
        throw forbidden();
      }

      await route.handler({
        req,
        res,
        url,
        params,
        body,
        user,
        store,
        env,
        requestId
      });
    } catch (error) {
      logger.error({ requestId, error: error.stack || error.message });
      sendError(res, error, requestId);
    }
  }

  return { add, handle };
}
