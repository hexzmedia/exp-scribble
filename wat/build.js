import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import wabtFactory from "wabt";

const wabt = await wabtFactory();
const src = readFileSync("scribble.wat", "utf8");
const mod = wabt.parseWat("scribble.wat", src, {
  multi_value: true,
  bulk_memory: true,
});
mod.resolveNames();
mod.validate();
const { buffer } = mod.toBinary({ log: false, write_debug_names: false });

mkdirSync("build", { recursive: true });
writeFileSync("build/scribble.wasm", Buffer.from(buffer));
console.log(`build/scribble.wasm — ${buffer.length} bytes`);
