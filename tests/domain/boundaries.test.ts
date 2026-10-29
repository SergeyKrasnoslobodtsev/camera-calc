// Границы модуля domain: без DOM и браузерного хранилища, импорты только внутри src/domain.
import { test } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const domainDir = resolve(import.meta.dirname, "../../src/domain");
const files = readdirSync(domainDir, { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts"))
  .map((file) => join(domainDir, file));
// код без комментариев: в комментариях эти слова допустимы
const code = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

test("в domain нет document, window, localStorage, navigator", () => {
  const found = files.flatMap((file) =>
    [
      ...code(file).matchAll(/\b(document|window|localStorage|navigator)\b/g),
    ].map((match) => `${file}: ${match[1]}`),
  );
  assert.deepEqual(found, []);
});

test("domain импортирует только свои файлы", () => {
  const outside = files.flatMap((file) =>
    // from "…", import "…" и import("…")
    [...code(file).matchAll(/\b(?:from|import)\s*\(?\s*"([^"]+)"/g)]
      .map((match) => match[1])
      .filter(
        (path) => !resolve(dirname(file), path).startsWith(domainDir + "/"),
      )
      .map((path) => `${file}: ${path}`),
  );
  assert.deepEqual(outside, []);
});
