import { copyFile, readFile } from "node:fs/promises";
import process from "node:process";

const files = [
  "index.html",
  "app/core.js",
  "app/state-render.js",
  "app/network.js",
  "app/table.js",
  "app/editor.js",
  "app/panel.js",
  "app/boot.js",
];
const check = process.argv.includes("--check");
let stale = false;

for (const file of files) {
  const publicFile = `public/${file}`;
  if (check) {
    const [source, deployed] = await Promise.all([
      readFile(file),
      readFile(publicFile).catch(() => null),
    ]);
    if (!deployed || !source.equals(deployed)) {
      console.error(`${publicFile} is stale; run npm run sync-public`);
      stale = true;
    }
  } else {
    await copyFile(file, publicFile);
    console.log(`synced ${file} -> ${publicFile}`);
  }
}

if (stale) process.exitCode = 1;
