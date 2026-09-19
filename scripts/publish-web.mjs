import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const webDir = path.join(root, "web");
const docsDir = path.join(root, "docs");

await rm(webDir, { recursive: true, force: true });
await cp(publicDir, webDir, { recursive: true });
await rm(docsDir, { recursive: true, force: true });
await mkdir(docsDir, { recursive: true });
await cp(publicDir, docsDir, { recursive: true });
await writeFile(path.join(docsDir, ".nojekyll"), "");
console.log("copied public/ -> web/ and docs/");
