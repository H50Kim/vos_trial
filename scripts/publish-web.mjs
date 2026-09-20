import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const webDir = path.join(root, "web");
const docsDir = path.join(root, "docs");
const wwwDir = path.join(root, "supabase", "functions", "app", "www");

function asTsModule(source) {
  return `export default ${JSON.stringify(source)};\n`;
}

await rm(webDir, { recursive: true, force: true });
await cp(publicDir, webDir, { recursive: true });
await rm(docsDir, { recursive: true, force: true });
await mkdir(docsDir, { recursive: true });
await cp(publicDir, docsDir, { recursive: true });
await writeFile(path.join(docsDir, ".nojekyll"), "");

await mkdir(wwwDir, { recursive: true });
for (const name of ["index.html", "app.js", "styles.css"]) {
  const source = await readFile(path.join(publicDir, name), "utf8");
  await writeFile(path.join(wwwDir, name), source);
  await writeFile(path.join(wwwDir, `${name}.ts`), asTsModule(source));
}

console.log("copied public/ -> web/, docs/, and supabase/functions/app/www/");
