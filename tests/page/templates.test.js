// @vitest-environment jsdom
// Экраны шаблонов: свои камера, модель и объект детекции, проверка форм камеры и объекта детекции.
import { test } from "vitest";
import assert from "assert";
import { fireEvent } from "@testing-library/react";
import { RU } from "../../src/i18n/ru.ts";
import { openPage } from "./open-page.tsx";
import {
  T,
  tbl,
  legend,
  go,
  enter,
  choose,
  submit,
  reportOf,
  addTemplates,
} from "./helpers.js";

test("своя камера и своя модель", async () => {
  await addTemplates();
  console.log("SYS:", T("systemKpis"));
  console.log("DSUM:", T("loadSummary"));
  console.log("LEGEND:", legend());
  console.log("GAUGES:", T("gauges"));
  console.log("VERDICT:", T("verdict"));
  console.log("FACTS:", T("facts"));
  console.log(
    "res disabled",
    document.getElementById("resolution").disabled,
    "sw",
    document.getElementById("sensorWidth").value,
  );
  console.log(
    "header btn:",
    T("templatesBtn"),
    document.getElementById("templatesBtn").getAttribute("href"),
  );
  go("#tpl-cams");
  console.log(
    "tpl visible",
    !document.getElementById("viewTemplates").hidden,
    "cams",
    !document.getElementById("templatePage-cams").hidden,
    "gpus",
    !document.getElementById("templatePage-gpus").hidden,
  );
  console.log(tbl("cameraTable"));
  go("#tpl-models");
  console.log("det first row:", tbl("modelTable").split("\n")[1]);
});

test("камера с дробным кадром не добавляется", async () => {
  await openPage();
  go("#tpl-cams");
  const cameraRows = () => document.querySelectorAll("#cameraTable tr").length;
  const rowsBefore = cameraRows();
  enter("cameraFormName", "Дробный кадр");
  enter("cameraFormWidth", "1920.5");
  enter("cameraFormHeight", "1080");
  enter("cameraFormSensorWidth", "5.6");
  submit("cameraForm");
  assert.strictEqual(
    cameraRows(),
    rowsBefore,
    "камера с дробным кадром добавлена",
  );
  assert.strictEqual(
    document.getElementById("cameraFormError").textContent,
    RU.cameraFormError(RU.errorFrame),
    "нет ошибки дробного кадра",
  );
});

test("недопустимое число камер не попадает в столбец «В системе»", async () => {
  await openPage();
  choose("camera", "k4");
  // столбец «В системе» у первой камеры, «Типовая 4 Мп»
  const camerasInUse = () => {
    go("#tpl-cams");
    const count = document.querySelector("#cameraTable tbody tr").children[5]
      .textContent;
    go("");
    return count;
  };
  enter("typeCount", "10");
  assert.strictEqual(camerasInUse(), "10", "10 камер не учтены");
  for (const count of ["1.5", "-3"]) {
    enter("typeCount", count);
    assert.strictEqual(
      camerasInUse(),
      "0",
      "число камер " + count + " попало в столбец",
    );
  }
});

test("свой объект детекции: выбор в карточке, удаление — карточка переходит на «Человек»", async () => {
  await openPage();
  go("#tpl-objects");
  enter("objectFormName", "Коробка");
  enter("objectFormWidth", "40");
  enter("objectFormLength", "30");
  enter("objectFormHeight", "20");
  enter("objectFormRequired", "32");
  submit("objectForm");
  const boxRow = () =>
    tbl("objectTable")
      .split("\n")
      .find((row) => row.includes("Коробка"));
  assert.ok(boxRow()?.includes("40 × 30 × 20"), "нет строки своего объекта");
  go("");
  const box = [...document.getElementById("objectTarget-0").options].find(
    (option) => option.text === "Коробка",
  );
  choose("objectTarget-0", box.value);
  assert.match(reportOf(), /\n {2}Коробка: /, "в отчёте нет своего объекта");
  go("#tpl-objects");
  assert.ok(
    boxRow().endsWith("| 1 | Удалить"),
    "не посчитана карточка: " + boxRow(),
  );
  fireEvent.click(
    document.querySelector(
      `#objectTable [aria-label="${RU.deleteAria("Коробка")}"]`,
    ),
  );
  assert.strictEqual(boxRow(), undefined, "объект не удалён");
  go("");
  // select без подходящего варианта тоже показал бы первый — «Человек», поэтому проверяется и расчёт
  assert.strictEqual(document.getElementById("objectTarget-0").value, "person");
  assert.doesNotMatch(reportOf(), /ошибка в исходных данных/);
});

test("объект детекции с нулевым габаритом и без порога не добавляется", async () => {
  await openPage();
  go("#tpl-objects");
  const objectRows = () => document.querySelectorAll("#objectTable tr").length;
  const rowsBefore = objectRows();
  enter("objectFormName", "Плоский");
  enter("objectFormWidth", "40");
  enter("objectFormLength", "30");
  enter("objectFormHeight", "0");
  submit("objectForm");
  assert.strictEqual(objectRows(), rowsBefore, "объект добавлен");
  assert.strictEqual(
    document.getElementById("objectFormError").textContent,
    RU.cameraFormError(`${RU.errorObjectSize}, ${RU.errorRequiredPx}`),
  );
});
