// Собирает dist/camera-calc.html из src/: разметка + формулы + модули src/js, собранные esbuild в один скрипт.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { build } from "esbuild";

const read = (name: string) =>
  readFileSync(new URL("src/" + name, import.meta.url), "utf8");
const formulas = [
  ["ru", "formulas.html"],
  ["en", "formulas.en.html"],
]
  .map(
    ([lang, name]) => `<div lang="${lang}">` + read(name).trimEnd() + "</div>",
  )
  .join("");
const slot = '<div class="formulas" id="formulas"></div>';
const layout = read("layout.html");
if (!layout.includes(slot))
  throw new Error("в layout.html нет места под формулы");
const { outputFiles } = await build({
  entryPoints: [new URL("src/js/init.js", import.meta.url).pathname],
  bundle: true,
  format: "iife",
  charset: "utf8",
  write: false,
});
const html =
  layout.replace(
    slot,
    () => '<div class="formulas" id="formulas">' + formulas + "</div>",
  ) +
  "\n<script>\n" +
  outputFiles[0].text +
  "</script>\n";
mkdirSync(new URL("dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("dist/camera-calc.html", import.meta.url), html);
console.log(
  `dist/camera-calc.html: ${html.length.toLocaleString("ru")} символов`,
);
