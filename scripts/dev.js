import { spawn } from "node:child_process";

const children = [];

function start(label, command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...env }
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`);
    }
  });
}

process.on("SIGINT", () => {
  for (const child of children) child.kill("SIGINT");
  process.exit(0);
});

start("backend", "node", ["apps/backend/src/server.js"]);
start("frontend", "node", ["apps/frontend/dev-server.js"]);

console.log("HerSphere dev stack starting:");
console.log("Backend:  http://localhost:4000");
console.log("Frontend: http://localhost:5173");
