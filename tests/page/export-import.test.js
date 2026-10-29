// @vitest-environment jsdom
// Экспорт и импорт файла, загрузка сохранения, изменение данных в другой вкладке.
import { beforeAll, test, vi } from "vitest";
import assert from "assert";
import { act, fireEvent, waitFor } from "@testing-library/react";
import { openPage } from "./open-page.tsx";
import {
  T,
  enter,
  reportOf,
  importFile,
  countReloads,
  addTemplates,
} from "./helpers.js";

const reloads = countReloads();
const gpuWithoutPrice = {
  id: "c1",
  name: "Без цены",
  arch: "Ada",
  tflops: 50,
  nvdec: 2,
  memoryGB: 24,
  tdpW: 300,
  custom: true,
};
// сохранение со своими шаблонами, отчёт и итоги по нему
let ex, exp, report, systemKpis;
beforeAll(async () => {
  ({ ex, exp } = await addTemplates());
  report = reportOf();
  systemKpis = T("systemKpis");
});

test("экспорт: файл JSON с сохранением", async () => {
  const exported = await addTemplates();
  let blob = null,
    href = "",
    attached = false,
    revoked = [];
  URL.createObjectURL = (b) => {
    blob = b;
    return "blob:x.test/1";
  };
  URL.revokeObjectURL = (u) => revoked.push(u);
  const anchorClick = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function () {
      href = this.href;
      attached = this.isConnected;
    });
  fireEvent.click(document.getElementById("exportBtn"));
  anchorClick.mockRestore();
  assert.ok(
    blob instanceof Blob && blob.type === "application/json",
    "экспорт: не Blob с JSON",
  );
  assert.strictEqual(href, "blob:x.test/1", "экспорт: ссылка не на Blob");
  assert.ok(attached, "экспорт: ссылка не в документе");
  assert.strictEqual(
    document.querySelectorAll("a[download]").length,
    0,
    "экспорт: ссылка осталась в документе",
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepStrictEqual(
    revoked,
    ["blob:x.test/1"],
    "экспорт: ссылка не освобождена",
  );
  const reader = new FileReader();
  reader.readAsText(blob);
  await new Promise((resolve) => (reader.onload = resolve));
  assert.strictEqual(reader.result, exported.exp, "экспорт: содержимое файла");
  assert.deepStrictEqual(
    [
      exported.ex.customCameras.map((c) => c.name),
      exported.ex.customModels.map((x) => x.name),
    ],
    [["Тест-камера 8 Мп"], ["Детектор деталей"]],
    "экспорт: нет своих шаблонов",
  );
});

test("импорт: файл, который не принят, данные не меняет", async () => {
  await openPage({ saved: exp });
  const before = localStorage.getItem("camcalc4");
  importFile("{битый");
  assert.strictEqual(T("toast"), "Файл не является сохранением калькулятора.");
  assert.strictEqual(
    localStorage.getItem("camcalc4"),
    before,
    "битый файл изменил данные",
  );
  // файлы, которые не приняла бы загрузка: данные не меняются, показывается ошибка
  const brokenSaves = [
    '{"types":[null]}',
    '{"types":[]}',
    "{}",
    JSON.stringify({ ...ex, types: [{ name: "Тип", objects: "x" }] }),
    JSON.stringify({ types: ex.types }),
    // запись, которую не приняла бы форма: GPU без цены, неизвестная подача объекта
    JSON.stringify({ ...ex, customGpus: [gpuWithoutPrice] }),
    JSON.stringify({
      ...ex,
      types: [
        {
          ...ex.types[0],
          objects: [{ ...ex.types[0].objects[0], feed: "crop" }],
        },
      ],
    }),
  ];
  for (const s of brokenSaves) {
    importFile(s);
    assert.strictEqual(
      T("toast"),
      "Файл не является сохранением калькулятора.",
      s,
    );
    assert.strictEqual(
      localStorage.getItem("camcalc4"),
      before,
      "файл изменил данные: " + s,
    );
  }
});

test("импорт: выбор файла только после подтверждения", async () => {
  await openPage({ saved: exp });
  let picks = 0;
  document.getElementById("importFile").click = () => picks++;
  fireEvent.click(document.getElementById("importBtn"));
  assert.strictEqual(T("importBtn"), "Заменить все данные");
  assert.strictEqual(picks, 0, "выбор файла без подтверждения");
  fireEvent.click(document.getElementById("importBtn"));
  assert.strictEqual(picks, 1, "второе нажатие не открыло выбор файла");
  assert.strictEqual(T("importBtn"), "Импорт");
});

test("импорт: файл не читается", async () => {
  await openPage({ saved: exp });
  const inp = document.getElementById("importFile"),
    kept = localStorage.getItem("camcalc4");
  Object.defineProperty(inp, "files", {
    value: [{ text: () => Promise.reject(new Error("NotReadableError")) }],
  });
  fireEvent.change(inp);
  await waitFor(() =>
    assert.strictEqual(T("toast"), "Не удалось прочитать файл."),
  );
  assert.strictEqual(localStorage.getItem("camcalc4"), kept);
});

test("экспорт → импорт: те же итоги и отчёт", async () => {
  await openPage();
  importFile(exp);
  assert.strictEqual(reloads.count, 1, "импорт не перезагрузил страницу");
  await openPage({ saved: localStorage.getItem("camcalc4") });
  assert.ok(
    [...document.getElementById("camera").options].some((o) =>
      o.text.startsWith("Тест-камера"),
    ),
    "после импорта нет своей камеры",
  );
  assert.strictEqual(T("systemKpis"), systemKpis, "после импорта другие итоги");
  assert.strictEqual(reportOf(), report, "после импорта другой отчёт");
});

test("загрузка: недопустимое значение списка заменяется на «авто»", async () => {
  await openPage({
    saved: JSON.stringify({
      ...ex,
      system: { ...ex.system, gpuCount: "8", gpu: "nope" },
    }),
  });
  assert.deepStrictEqual(
    [
      document.getElementById("gpuCount").value,
      document.getElementById("gpu").value,
    ],
    ["auto", "auto"],
    "недопустимое значение списка после загрузки",
  );
});

test("загрузка: недопустимая запись отбрасывается", async () => {
  await openPage({
    saved: JSON.stringify({
      ...ex,
      customGpus: [
        gpuWithoutPrice,
        { ...gpuWithoutPrice, id: "c2", price: 900 },
      ],
    }),
  });
  assert.deepStrictEqual(
    [...document.getElementById("gpu").options]
      .map((o) => o.value)
      .filter((id) => id === "c1" || id === "c2"),
    ["c2"],
    "загрузка: GPU без цены не отброшен или отброшен допустимый",
  );
});

test("данные изменены в другой вкладке: вкладка их не затирает", async () => {
  await openPage({ saved: exp });
  const other = JSON.stringify({
    ...ex,
    types: [{ ...ex.types[0], name: "Из другой вкладки" }],
  });
  localStorage.setItem("camcalc4", other);
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: "camcalc4" }));
  });
  enter("efficiency", "0.5");
  assert.strictEqual(
    localStorage.getItem("camcalc4"),
    other,
    "вкладка затёрла данные другой вкладки",
  );
  assert.strictEqual(
    document.getElementById("toast").textContent,
    "Данные изменены в другой вкладке. Обновите страницу.",
  );
});
