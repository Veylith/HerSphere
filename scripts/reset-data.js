import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), "apps/backend/data/store.json");
if (existsSync(file)) {
  rmSync(file, { force: true });
  console.log("Local data store reset. It will be recreated on next backend start.");
} else {
  console.log("Local data store is already clean.");
}
