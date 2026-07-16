import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { request } from "node:http";

const root = resolve(import.meta.dirname);
const port = Number(process.env.FRONTEND_PORT || 5173);
const apiPort = Number(process.env.PORT || 4000);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png"
};

function serveFile(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = join(root, normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, ""));
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    createReadStream(join(root, "index.html")).pipe(res.writeHead(200, { "Content-Type": mime[".html"] }));
    return;
  }
  createReadStream(filePath).pipe(res.writeHead(200, { "Content-Type": mime[extname(filePath)] || "application/octet-stream" }));
}

function proxyApi(req, res) {
  const proxy = request(
    {
      hostname: "localhost",
      port: apiPort,
      path: req.url,
      method: req.method,
      headers: req.headers
    },
    (apiRes) => {
      res.writeHead(apiRes.statusCode || 500, apiRes.headers);
      apiRes.pipe(res);
    }
  );
  proxy.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "Backend API is not running" } }));
  });
  req.pipe(proxy);
}

createServer((req, res) => {
  if (req.url?.startsWith("/api/")) {
    proxyApi(req, res);
    return;
  }
  serveFile(new URL(req.url, `http://localhost:${port}`).pathname, res);
}).listen(port, () => {
  console.log(`HerSphere frontend running at http://localhost:${port}`);
});
