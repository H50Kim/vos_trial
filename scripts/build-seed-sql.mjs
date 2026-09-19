import { readFile, writeFile } from "node:fs/promises";

const payload = await readFile("data/db.json", "utf8");
const secret = (await readFile("data/.secret", "utf8")).trim();
if (payload.includes("$voc$")) throw new Error("delimiter clash");
const escapedSecret = secret.replaceAll("'", "''");
const sql = `insert into public.voc_store (id, payload, secret)
values ('main', $voc$${payload}$voc$::jsonb, '${escapedSecret}')
on conflict (id) do update
set payload = excluded.payload,
    secret = excluded.secret,
    updated_at = now();`;
await writeFile("tmp-seed.sql", sql, "utf8");
console.log("sql-bytes", Buffer.byteLength(sql));
