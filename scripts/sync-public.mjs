import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const files = [
  "index.html",
  "app/core.js",
  "content/catalog.js",
  "content/east-tennessee-health.js",
  "content/east-tennessee-rounds.js",
  "content/east-tennessee-characters.js",
  "content/east-tennessee-talents.js",
  "content/east-tennessee-npcs.js",
  "content/east-tennessee-finchs-nest.js",
  "content/east-tennessee-lick-creek.js",
  "assets/campaigns/east-tennessee-1861/lick-creek/player-map.svg",
  "assets/campaigns/east-tennessee-1861/finchs-nest/exterior.svg",
  "assets/campaigns/east-tennessee-1861/finchs-nest/ground-floor.svg",
  "assets/campaigns/east-tennessee-1861/finchs-nest/upper-floor.svg",
  "content/east-tennessee-equipment.js",
  "content/east-tennessee-combat.js",
  "content/campaigns.js",
  "app/runtime.js",
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
    await mkdir(dirname(publicFile), { recursive: true });
    await copyFile(file, publicFile);
    console.log(`synced ${file} -> ${publicFile}`);
  }
}

if (stale) process.exitCode = 1;
