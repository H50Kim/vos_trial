import { readFile, writeFile } from "node:fs/promises";

const html = await readFile("public/index.html", "utf8");
const css = await readFile("public/styles.css", "utf8");
const js = await readFile("public/app.js", "utf8");
const out = html
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n    </style>`)
  .replace('<script src="app.js" type="module"></script>', `<script>\n${js}\n    </script>`);
await writeFile("apps-script/Index.html", out);
console.log("index-bytes", Buffer.byteLength(out));
