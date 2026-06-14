// One-off: delete all `kflow:*` keys from Upstash via the REST API.
// Run: node --env-file=packages/server/.env packages/server/scripts/flush-cache.mjs
const base = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!base || !token) {
  console.error("Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN");
  process.exit(1);
}

async function cmd(args) {
  const res = await fetch(base, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`${args[0]} failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result;
}

let cursor = "0";
let deleted = 0;
let scanned = 0;
do {
  const [next, keys] = await cmd(["SCAN", cursor, "MATCH", "kflow:*", "COUNT", "500"]);
  cursor = next;
  scanned += keys.length;
  if (keys.length > 0) {
    deleted += await cmd(["DEL", ...keys]);
  }
} while (cursor !== "0");

console.log(`Flushed Upstash: matched ${scanned} kflow:* keys, deleted ${deleted}.`);
