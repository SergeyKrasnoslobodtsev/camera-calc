// Сборка в один файл dist/index.html: скрипт и стили встраиваются в страницу.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // модули собраны в один скрипт, подгружать заранее нечего
  build: { modulePreload: { polyfill: false } },
});
