// @vitest-environment jsdom
// Язык страницы: выбор и его сохранение, отчёт на EN, встроенные и свои названия.
import { beforeAll, test, vi } from "vitest";
import assert from "assert";
import { act, fireEvent } from "@testing-library/react";
import { RU } from "../../src/i18n/ru.ts";
import { openPage } from "./open-page.tsx";
import { enter, reportOf, countReloads, addTemplates } from "./helpers.js";

const reloads = countReloads();
const builtinRu = [...RU.typeNames, ...RU.presetNames, RU.objDefault];
// сохранение со своими шаблонами и отчёт по нему на RU
let ex, exp, reportRu;
beforeAll(async () => {
  ({ ex, exp } = await addTemplates());
  reportRu = reportOf();
});

test("слишком мелкий объект: полная подсказка о разрешении", async () => {
  await openPage();
  const tooSmall = JSON.parse(localStorage.getItem("camcalc4"));
  tooSmall.types[0].objects[0].width = 8;
  for (const [lang, hint] of [
    ["ru", /^Для «.+» требуется не меньше [\d\s]+\spx по горизонтали \(.+\)/],
    ["en", /^".+" requires at least [\d,]+ px horizontally \(.+\)/],
  ]) {
    await openPage({ saved: JSON.stringify(tooSmall), lang });
    const notes = [...document.querySelectorAll("#verdict li")].map(
      (li) => li.textContent,
    );
    assert.ok(
      notes.some((note) => hint.test(note)),
      "нет подсказки о разрешении, " + lang + ": " + notes.join(" | "),
    );
  }
});

test("отчёт на EN: без кириллицы, кроме своих названий, числа как в RU", async () => {
  await openPage({ saved: exp, lang: "en" });
  assert.strictEqual(document.documentElement.lang, "en");
  assert.ok(
    document.querySelector("#formulas>[lang=en]") &&
      !document.querySelector("#formulas>[lang=ru]"),
    "EN: не тот блок формул",
  );
  const userNames = [
    ...ex.types
      .flatMap((T) => [T.name, ...T.objects.map((o) => o.name)])
      .filter((n) => !builtinRu.includes(n)),
    ...ex.customCameras.map((c) => c.name),
    ...ex.customModels.map((x) => x.name),
    ...ex.customGpus.map((g) => g.name),
  ].sort((a, b) => b.length - a.length);
  const rEn = reportOf();
  const cyr = userNames
    .reduce((s, n) => s.split(n).join(""), rEn)
    .match(/.*[А-Яа-яЁё].*/g);
  assert.strictEqual(cyr, null, "кириллица в EN-отчёте: " + cyr);
  const nums = (s, ru) =>
    (ru
      ? s
          .replace(/(\d)[\u00a0\u202f](?=\d)/g, "$1")
          .replace(/(\d),(?=\d)/g, "$1.")
      : s.replace(/(\d),(?=\d)/g, "$1")
    ).match(/\d+(?:\.\d+)?/g);
  assert.deepStrictEqual(
    nums(rEn, false),
    nums(reportRu, true),
    "числа EN-отчёта не совпадают с RU",
  );
});

test("язык: при первом открытии — язык браузера, выбор сохраняется", async () => {
  await openPage({ lang: null, browserLang: "ru-RU" });
  assert.strictEqual(
    document.documentElement.lang,
    "ru",
    "язык браузера ru не учтён",
  );
  await openPage({ lang: null });
  const r0 = reloads.count;
  assert.strictEqual(document.documentElement.lang, "en");
  assert.strictEqual(document.getElementById("langBtn").textContent, "RU");
  fireEvent.click(document.getElementById("langBtn"));
  assert.strictEqual(
    reloads.count,
    r0 + 1,
    "переключение языка не перезагрузило страницу",
  );
  await openPage({
    lang: localStorage.getItem("camcalc-lang"),
    browserLang: "en-US",
  });
  assert.strictEqual(
    document.documentElement.lang,
    "ru",
    "выбор языка не сохранился",
  );
  assert.strictEqual(
    document.getElementById("templatesBtn").textContent,
    "Шаблоны",
  );
});

test("язык: при первом открытии — первый поддерживаемый из языков браузера", async () => {
  for (const [browserLangs, lang] of [
    [["uk", "ru", "en"], "ru"],
    [["en-US", "ru"], "en"],
    [["de", "fr"], "en"],
  ]) {
    await openPage({ lang: null, browserLang: browserLangs[0], browserLangs });
    assert.strictEqual(
      document.documentElement.lang,
      lang,
      "языки браузера " + browserLangs.join(", "),
    );
  }
});

test("язык: без доступа к localStorage передаётся в адресе", async () => {
  await openPage();
  const r0 = reloads.count;
  const setItem = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(() => {
      throw new Error("denied");
    });
  fireEvent.click(document.getElementById("langBtn"));
  setItem.mockRestore();
  assert.strictEqual(reloads.count, r0 + 1, "страница не перезагружена");
  assert.strictEqual(location.search, "?lang=en", "язык не попал в адрес");
  await openPage({ search: "lang=en" });
  assert.strictEqual(
    document.documentElement.lang,
    "en",
    "язык из адреса не учтён",
  );
  // когда сохранить можно, язык из адреса убирается, иначе он перекрыл бы выбор
  fireEvent.click(document.getElementById("langBtn"));
  assert.strictEqual(location.search, "", "язык остался в адресе");
  assert.strictEqual(localStorage.getItem("camcalc-lang"), "ru");
});

test("язык, изменённый в другой вкладке: уведомление", async () => {
  await openPage();
  const changeInOtherTab = (lang) =>
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "camcalc-lang", newValue: lang }),
      );
    });
  changeInOtherTab("ru");
  assert.notStrictEqual(
    document.getElementById("toast").textContent,
    RU.langStale,
    "уведомление, хотя язык тот же",
  );
  changeInOtherTab("en");
  assert.strictEqual(
    document.getElementById("toast").textContent,
    RU.langStale,
  );
});

test("встроенные названия, сохранённые на RU, показываются на EN", async () => {
  await openPage();
  await openPage({ saved: localStorage.getItem("camcalc4"), lang: "en" });
  const shown = [
    reportOf(),
    document.getElementById("tabs").textContent,
    document.getElementById("typeName").value,
    ...[...document.querySelectorAll("[id^=objectName-]")].map(
      (el) => el.value,
    ),
  ].join("\n");
  assert.deepStrictEqual(
    builtinRu.filter((n) => shown.includes(n)),
    [],
    "EN: встроенные названия на русском",
  );
  assert.ok(
    ["Workstation", "Cart", "Person"].every((n) => shown.includes(n)),
    "EN: нет встроенных названий на английском",
  );
});

test("название пользователя не переводится, даже если совпадает со встроенным", async () => {
  await openPage();
  enter("typeName", "Тележка");
  await openPage({ saved: localStorage.getItem("camcalc4"), lang: "en" });
  assert.strictEqual(
    document.getElementById("typeName").value,
    "Тележка",
    "EN: название пользователя переведено",
  );
});
