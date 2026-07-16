import { spawnSync } from "node:child_process";

function run(label, args) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("Backend syntax", ["--check", "apps/backend/src/server.js"]);
run("Routes syntax", ["--check", "apps/backend/src/http/routes.js"]);
run("Frontend syntax", ["--check", "apps/frontend/src/app.js"]);
run("Frontend build", ["scripts/build.js"]);
run("Tests", ["scripts/run-tests.js"]);

console.log("\nVerification complete.");
