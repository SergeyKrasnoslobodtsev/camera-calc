// Сборка в один файл dist/camera-calc.html: скрипт и стили встраиваются в страницу, формулы RU и EN — в блок #formulas.
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

const slot = '<div class="formulas" id="formulas"></div>';

function formulas(): Plugin {
  const read = (name: string) =>
    readFileSync(new URL("src/" + name, import.meta.url), "utf8").trimEnd();
  return {
    name: "formulas",
    transformIndexHtml(html) {
      if (!html.includes(slot))
        throw new Error("в index.html нет места под формулы");
      const blocks =
        `<div lang="ru">${read("formulas.html")}</div>` +
        `<div lang="en">${read("formulas.en.html")}</div>`;
      return html.replace(
        slot,
        () => `<div class="formulas" id="formulas">${blocks}</div>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), formulas(), viteSingleFile()],
  // модули собраны в один скрипт, подгружать заранее нечего
  build: { modulePreload: { polyfill: false } },
});
