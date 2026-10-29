// Словари RU и EN: одинаковые ключи; каждый ключ используется в коде или разметке, каждый используемый есть в словаре.
import { test } from "vitest";
import fs from "fs";
import assert from "assert";
import { RU } from "../../src/i18n/ru.ts";
import { EN } from "../../src/i18n/en.ts";

test("в EN те же ключи, что в RU", () => {
  const sameKeys = (a, b, p) =>
    Object.keys(a).forEach((k) => {
      assert.ok(k in b, "нет ключа в EN: " + p + k);
      if (Array.isArray(a[k]))
        assert.strictEqual(b[k].length, a[k].length, "длина в EN: " + p + k);
      else if (a[k] && typeof a[k] === "object")
        sameKeys(a[k], b[k], p + k + ".");
    });
  sameKeys(RU, EN, "");
  const extraKeys = (a, b, p) =>
    Object.keys(a).flatMap((k) =>
      !(k in b)
        ? [p + k]
        : a[k] && typeof a[k] === "object" && !Array.isArray(a[k])
          ? extraKeys(a[k], b[k], p + k + ".")
          : [],
    );
  assert.deepStrictEqual(
    extraKeys(EN, RU, ""),
    [],
    "ключи EN, которых нет в RU",
  );
});

test("ключи словаря используются, используемые ключи есть в словаре", () => {
  const srcDir = import.meta.dirname + "/../../src/";
  const appCode = ["ui", "app", "i18n", "domain"]
    .flatMap((dir) =>
      fs
        .readdirSync(srcDir + dir, { recursive: true, encoding: "utf8" })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => fs.readFileSync(srcDir + dir + "/" + file, "utf8")),
    )
    .concat(
      ["main.tsx", "start.ts"].map((file) =>
        fs.readFileSync(srcDir + file, "utf8"),
      ),
    )
    .join("\n")
    .replace(/^export const (RU|EN)\b[^=]*= \{\n[\s\S]*?^\};/gm, "")
    .replace(/byId(<[^>]*>)?\(["'`][^"'`]*["'`]\)/g, "");
  const layoutSource = fs.readFileSync(srcDir + "../index.html", "utf8");
  const dictKeys = Object.keys(RU).filter((key) => key !== "tips");
  const markupKeys = [...layoutSource.matchAll(/data-t[atp]?="([^"]+)"/g)].map(
    (match) => match[1],
  );
  // a key counts as used when the code has a string with its name: t(cond ? "a" : "b") passes keys as strings;
  // a nameKey like "builtinCameraNames.k4" uses its first part
  const codeStrings = [
    ...appCode.matchAll(/["'`]([\w$]+)[."'`]|STR\.([\w$]+)/g),
  ].map((match) => match[1] || match[2]);
  assert.deepStrictEqual(
    dictKeys.filter(
      (key) => !markupKeys.includes(key) && !codeStrings.includes(key),
    ),
    [],
    "неиспользуемые ключи словаря",
  );
  const calledKeys = [...appCode.matchAll(/\bt\("([\w$]+)"/g)].map(
    (match) => match[1],
  );
  assert.deepStrictEqual(
    [...markupKeys, ...calledKeys].filter((key) => !dictKeys.includes(key)),
    [],
    "ключи, которых нет в словаре",
  );
});
