// Takes the pins for every UDPipe 1 model in the Universal Dependencies 2.5
// release (hdl:11234/1-3131): each file's LINDAT bitstream id and the sha256 of
// a real download, after checking the download against the MD5 that LINDAT
// publishes for it. Writes them to server/utils/lemmas/udpipe-models.json,
// which server/utils/lemmas/models.ts reads.
//
//   node scripts/pin-udpipe-models.mjs
//
// lindat.mff.cuni.cz must be reachable. CI can run it: see .github/workflows/pin-models.yml.

import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

const API = "https://lindat.mff.cuni.cz/repository/server/api";
const HANDLE = "11234/1-3131";

async function json(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

async function bitstreams() {
  const item = await json(`${API}/pid/find?id=${encodeURIComponent(HANDLE)}`);
  const bundles = await json(`${API}/core/items/${item.uuid}/bundles?size=100`);
  const original = bundles._embedded.bundles.find((b) => b.name === "ORIGINAL");
  if (!original) throw new Error("The item has no ORIGINAL bundle.");
  const all = [];
  for (let url = `${API}/core/bundles/${original.uuid}/bitstreams?size=200`; url;) {
    const page = await json(url);
    all.push(...page._embedded.bitstreams);
    url = page._links?.next?.href;
  }
  return all;
}

const OUT = new URL("../server/utils/lemmas/udpipe-models.json", import.meta.url);
const models = (await bitstreams()).filter((b) => b.name.endsWith(".udpipe"));
const pins = [];
let failed = 0;
for (const model of models) {
  const res = await fetch(`${API}/core/bitstreams/${model.uuid}/content`);
  if (!res.ok) {
    console.error(`${model.name}: download answered ${res.status}`);
    failed++;
    continue;
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const md5 = createHash("md5").update(bytes).digest("hex");
  if (model.checkSum?.checkSumAlgorithm !== "MD5" || model.checkSum.value !== md5) {
    console.error(`${model.name}: MD5 ${md5} doesn't match LINDAT's ${model.checkSum?.value}; not pinned`);
    failed++;
    continue;
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  pins.push({ file: model.name, uuid: model.uuid, sha256, bytes: bytes.length });
}
pins.sort((a, b) => a.file.localeCompare(b.file));
await writeFile(OUT, `${JSON.stringify(pins, null, 2)}\n`);
console.log(`${pins.length} of ${models.length} models pinned`);
if (failed) process.exitCode = 1;
