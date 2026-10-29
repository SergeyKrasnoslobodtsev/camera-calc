// @vitest-environment jsdom
// Страница расчёта: подсказки у полей, копия типа.
import { test } from "vitest";
import assert from "assert";
import { fireEvent } from "@testing-library/react";
import { RU } from "../../src/i18n/ru.ts";
import { openPage } from "./open-page.tsx";
import { addTemplates } from "./helpers.js";

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
    [...document.querySelectorAll("#tabs .tab b")].map((b) => b.textContent),
    [RU.typeNames[0], RU.typeNames[0] + RU.copySuffix, RU.typeNames[1]],
    "копия типа",
  );
  assert.strictEqual(
    document.querySelectorAll("#objectList .ocard").length,
    2,
    "объекты копии",
  );
});
