import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

function collect(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = resolve(dir, entry);
      return statSync(path).isDirectory() ? collect(path) : path;
    })
    .filter((path) => path.endsWith(".test.js"));
}

const files = collect(resolve(process.cwd(), "tests"));
if (!files.length) {
  console.error("No tests found.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  env: process.env
});
process.exit(result.status ?? 1);
