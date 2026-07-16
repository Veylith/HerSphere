import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "apps/frontend");
const dist = resolve(root, "apps/frontend/dist");

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const entry of ["index.html", "src", "public"]) {
  cpSync(resolve(source, entry), resolve(dist, entry), { recursive: true });
}

console.log(`Frontend production bundle written to ${dist}`);
