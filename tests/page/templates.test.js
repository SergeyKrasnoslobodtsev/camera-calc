// @vitest-environment jsdom
// Экраны шаблонов: свои камера и детектор, проверка формы камеры.
import { test } from "vitest";
import assert from "assert";
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
  addTemplates,
} from "./helpers.js";

test("своя камера и свой детектор", async () => {
  await addTemplates();
  console.log("SYS:", T("systemKpis"));
  console.log("DSUM:", T("loadSummary"));
  console.log(
    "DONUT:",
    T("donut"),
    "| circles",
    document.querySelectorAll("#donut circle").length,
  );
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
  go("#tpl-dets");
  console.log("det first row:", tbl("detectorTable").split("\n")[1]);
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
