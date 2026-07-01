import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const root = path.resolve(scriptDir, "..");
const imgDir = path.join(root, "imgas");
const outJson = path.join(root, "levels.json");
const outJs = path.join(root, "levels.js");

const extOk = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

try {
  const files = await readdir(imgDir, { withFileTypes: true });
  const levels = files
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => extOk.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .map((name) => `./imgas/${name}`);

  await writeFile(outJson, `${JSON.stringify(levels, null, 2)}\n`, "utf8");
  await writeFile(
    outJs,
    `window.PUZZLE_LEVELS = ${JSON.stringify(levels, null, 2)};\n`,
    "utf8"
  );
  console.log(`生成完成: ${levels.length} 关 -> levels.json, levels.js`);
} catch (error) {
  console.error("生成失败:", error.message);
  process.exitCode = 1;
}
