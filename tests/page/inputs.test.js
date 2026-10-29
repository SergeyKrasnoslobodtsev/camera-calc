// @vitest-environment jsdom
// Числовые поля и проверка ввода: ошибка вместо молчаливой подстановки.
import { beforeAll, test } from "vitest";
import assert from "assert";
import { RU } from "../../src/i18n/ru.ts";
import { EN } from "../../src/i18n/en.ts";
import { openPage } from "./open-page.tsx";
import { go, enter, reportOf, addTemplates } from "./helpers.js";

// сохранение со своими шаблонами
let exp;
beforeAll(async () => {
  ({ exp } = await addTemplates());
});

test("числовые поля: «1,999» на EN не 1.999, целые без дробей, min=0", async () => {
  await openPage({ lang: "en" });
  go("#tpl-gpus");
  enter("gpuPrice-l40s", "1,999");
  // поле type="number" не принимает «1,999», и пустая цена — ошибка подбора;
  // при цене 1.999 ошибки не было бы, а L40S попала бы в отчёт за $2
  const report = reportOf();
  assert.ok(
    report.includes(EN.reportComputeError) && !report.includes("× L40S"),
    "EN: «1,999» прочитано как 1.999",
  );
  const textNumbers = [...document.querySelectorAll("input[inputmode]")].filter(
    (el) => el.type !== "number",
  );
  assert.deepStrictEqual(
    textNumbers.map((el) => el.id),
    [],
    "числовые поля не type=number",
  );
  const tCount = document.getElementById("typeCount");
  tCount.value = "1.5";
  assert.strictEqual(
    tCount.checkValidity(),
    false,
    "количество камер 1.5 прошло",
  );
  const fractional = [
    ...document.querySelectorAll('input[inputmode="numeric"]'),
  ]
    .filter((el) => el.step !== "1")
    .map((el) => el.id);
  assert.deepStrictEqual(fractional, [], "целые поля принимают дробь");
  const noMin = [...document.querySelectorAll('input[type="number"]')]
    .filter((el) => el.min !== "0")
    .map((el) => el.id);
  assert.ok(
    document.getElementById("gpuPrice-l40s") &&
      document.getElementById("objectWidth-0"),
    "нет полей цены или объекта",
  );
  assert.deepStrictEqual(noMin, [], "числовые поля без min=0");
});

test("сохранение с десятичной запятой загружается как 1.5", async () => {
  const withNumbers = (H, w, kr) => {
    const st = JSON.parse(exp);
    st.types[0].inputs.cameraHeight = H;
    st.types[0].objects[0].width = w;
    st.system.efficiency = kr;
    return JSON.stringify(st);
  };
  for (const lang of ["ru", "en"]) {
    await openPage({ saved: withNumbers("4.5", "50.5", "0.5"), lang });
    const dotReport = reportOf();
    await openPage({ saved: withNumbers("4,5", "50,5", "0,5"), lang });
    assert.strictEqual(
      document.getElementById("cameraHeight").value,
      "4.5",
      lang,
    );
    assert.strictEqual(
      document.getElementById("efficiency").value,
      "0.5",
      lang,
    );
    assert.strictEqual(
      reportOf(),
      dotReport,
      "сохранение с запятой: другой отчёт, " + lang,
    );
  }
});

test("ошибка ввода в типе: строка сохраняется, расчёт показывает ошибку", async () => {
  for (const [id, value] of [
    ["typeCount", "1.5"],
    ["cameraHeight", "-1"],
  ]) {
    await openPage();
    enter(id, value);
    const checkPage = () => {
      assert.strictEqual(document.getElementById(id).value, value, id);
      assert.match(
        document.getElementById("verdict").textContent,
        new RegExp(RU.pillError),
        `${id} ${value}: вердикт`,
      );
      assert.match(
        reportOf(),
        /× \d+: ошибка в исходных данных/,
        `${id} ${value}: отчёт`,
      );
    };
    checkPage();
    // тот же черновик из сохранения
    await openPage({ saved: localStorage.getItem("camcalc4") });
    checkPage();
  }
});

test("ошибка ввода в системе: подбор не выполняется", async () => {
  for (const [id, value] of [
    ["efficiency", ""],
    ["reserve", "-5"],
    ["gpuPrice-l40s", "-5"],
    ["gpuPrice-l40s", ""],
  ]) {
    await openPage();
    go("#tpl-gpus");
    enter(id, value);
    go("");
    assert.strictEqual(
      document.getElementById("loadNote").textContent,
      RU.systemInputError,
      `${id} «${value}»: системный блок`,
    );
    const report = reportOf();
    assert.ok(
      report.includes(RU.reportComputeError),
      `${id} «${value}»: отчёт`,
    );
    assert.ok(
      !/Вычислитель \(оценка\): \d+ ×/.test(report),
      `${id} «${value}»: подбор`,
    );
  }
});
