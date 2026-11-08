import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const canonical = readFileSync(new URL("../templates/templates.json", import.meta.url), "utf8");
const packed = readFileSync(new URL("./src/data/templates.json", import.meta.url), "utf8");
if (canonical !== packed) {
  console.error("web/src/data/templates.json does not match templates/templates.json");
  process.exit(1);
}
const wasm = readFileSync(new URL("./public/godot/engine/index.wasm", import.meta.url));
const pck = readFileSync(new URL("./public/godot/engine/index.pck", import.meta.url));
const host = readFileSync(new URL("./src/lib/godot-host.ts", import.meta.url), "utf8");
if (!host.includes(`.pck\`]: ${pck.length}`) || !host.includes(`.wasm\`]: ${wasm.length}`)) {
  console.error(`Godot file sizes drifted. pck=${pck.length} wasm=${wasm.length}`);
  process.exit(1);
}
if (!host.includes('import.meta.env.BASE_URL')) {
  console.error("godot host is not rooted at the Pages base path");
  process.exit(1);
}
console.log(`contract ok (${here.endsWith("/") ? "web" : "web"}) wasm=${wasm.length} pck=${pck.length}`);
