import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const webDir = path.join(root, "web");

await rm(webDir, { recursive: true, force: true });
await cp(distDir, webDir, { recursive: true });
console.log("copied dist/ -> web/");
