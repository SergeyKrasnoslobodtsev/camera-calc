// @vitest-environment jsdom
// Страница расчёта: подсказки у полей, копия типа, загрузка примера.
import { test } from "vitest";
import assert from "assert";
import { fireEvent } from "@testing-library/react";
import { RU } from "../../src/i18n/ru.ts";
import { openPage } from "./open-page.tsx";
import { T, addTemplates, choose, enter } from "./helpers.js";

// у каждой подсказки есть кнопка «?» у её поля (objects: подсказка в заголовке, а не у поля)
test("у каждой подсказки есть кнопка «?»", async () => {
  await addTemplates();
  assert.deepStrictEqual(
    Object.keys(RU.tips).filter(
      (key) =>
        key !== "objects" &&
        !document.querySelector(`.tipbtn[data-key="${key}"]`),
    ),
    [],
    "подсказки без кнопки «?»",
  );
});

test("копия типа: сразу после исходного, с суффиксом, с теми же объектами", async () => {
  await openPage();
  fireEvent.click(document.getElementById("duplicateTypeBtn"));
  assert.deepStrictEqual(
    [...document.querySelectorAll("#typeList .row b")].map(
      (b) => b.textContent,
    ),
    [RU.typeNames[0], RU.typeNames[0] + RU.copySuffix, RU.typeNames[1]],
    "копия типа",
  );
  assert.strictEqual(
    document.querySelectorAll("#objectList .ocard").length,
    2,
    "объекты копии",
  );
});

test("пример заменяет расчёт только по второму нажатию", async () => {
  await openPage();
  fireEvent.click(document.getElementById("duplicateTypeBtn"));
  const tabs = () => document.querySelectorAll("#typeList .row b").length;
  fireEvent.click(document.getElementById("resetBtn"));
  assert.strictEqual(T("resetBtn"), "Заменить текущий расчёт");
  assert.strictEqual(tabs(), 3, "пример загружен без подтверждения");
  fireEvent.click(document.getElementById("resetBtn"));
  assert.strictEqual(tabs(), 2, "второе нажатие не загрузило пример");
  assert.strictEqual(T("resetBtn"), "Загрузить пример");
});

test("поля параметров системы принимают ввод", async () => {
  await openPage();
  choose("gpuCount", "2");
  assert.strictEqual(document.getElementById("gpuCount").value, "2");
  enter("archiveDays", "30");
  assert.strictEqual(document.getElementById("archiveDays").value, "30");
});

const shares = () =>
  [...document.querySelectorAll("#typeList .row .pc")].map((el) =>
    parseFloat(el.textContent),
  );

test("сводка: типы, вычислитель, инференс, декодер, память, поток", async () => {
  await openPage();
  const summary = T("systemKpis");
  [
    "0недостаточно",
    "1с замечаниями",
    "1достаточно",
    "1 × L40S",
    "$9 000",
    "Инференс82%",
    "Декодер13%",
  ].forEach((part) =>
    assert.ok(summary.includes(part), part + " нет в: " + summary),
  );
  assert.ok(summary.includes("Видеопамять8%"), summary);
  assert.ok(summary.includes("32 Мбит/с"), summary);
  assert.strictEqual(
    document.getElementById("systemKpis").getAttribute("href"),
    "#system",
  );
});

test("доли типов в списке складываются в инференс сводки", async () => {
  await openPage();
  assert.deepStrictEqual(shares(), [60, 22]);
  assert.ok(T("systemKpis").includes("Инференс82%"));
});

test("фильтры списка оставляют типы с выбранным статусом", async () => {
  await openPage();
  enter("cameraHeight", "0.5");
  const rows = () => document.querySelectorAll("#typeList .row").length;
  const chip = (text) =>
    [...document.querySelectorAll(".chip")].find((el) =>
      el.textContent.startsWith(text),
    );
  assert.strictEqual(rows(), 2);
  fireEvent.click(chip("Недостаточно"));
  assert.strictEqual(rows(), 1);
  assert.strictEqual(chip("Недостаточно").textContent, "Недостаточно 1");
  fireEvent.click(chip("Замечания"));
  assert.strictEqual(rows(), Number(chip("Замечания").textContent.at(-1)));
  fireEvent.click(chip("Все"));
  assert.strictEqual(rows(), 2);
});

test("строка типа в нагрузке раскрывается до объектов и моделей", async () => {
  await openPage();
  const first = document.querySelector("#legend .exp");
  assert.strictEqual(document.querySelectorAll("#legend .model").length, 0);
  fireEvent.click(first);
  assert.strictEqual(first.getAttribute("aria-expanded"), "true");
  const models = [...document.querySelectorAll("#legend .model")].map(
    (el) => el.textContent,
  );
  assert.strictEqual(models.length, 2);
  assert.ok(models[0].includes("Кисть руки"), models[0]);
  assert.ok(models[0].includes("YOLO26s · тайлы 640"), models[0]);
  fireEvent.click(first);
  assert.strictEqual(document.querySelectorAll("#legend .model").length, 0);
});

test("больше пяти типов: остальные — одной строкой с разбивкой", async () => {
  await openPage();
  for (let i = 0; i < 4; i++)
    fireEvent.click(document.getElementById("duplicateTypeBtn"));
  const rows = [...document.querySelectorAll("#legend > li")];
  assert.strictEqual(rows.length, 6);
  assert.ok(rows[5].textContent.startsWith("Другие типы: 1"));
});

test("у типа «Недостаточно» кнопка ведёт к объекту, у прошедшего её нет", async () => {
  await openPage();
  assert.strictEqual(document.querySelector(".openobject"), null);
  choose("objectFeed-1", "full");
  const card = document
    .querySelector("#objectList .ores.bad")
    .closest(".ocard");
  let scrolled = false;
  card.scrollIntoView = () => (scrolled = true);
  fireEvent.click(document.querySelector(".openobject"));
  assert.ok(scrolled);
});
