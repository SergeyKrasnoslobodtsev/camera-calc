// @vitest-environment jsdom
// Тест-эталон: результаты расчёта для набора конфигураций сравниваются с tests/golden/golden.txt.
// Обновить эталон после намеренного изменения расчёта: npx vitest run tests/golden -u
import { expect, test } from "vitest";
import { fireEvent } from "@testing-library/react";
import { openPage } from "../page/open-page.tsx";

// отчёт так, как его получает пользователь: кнопка «Копировать отчёт» пишет его в буфер обмена;
// запись не завершается, чтобы уведомление «Отчёт скопирован» не заменило другие
function reportOf() {
  let copied;
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: (text) => ((copied = text), new Promise(() => {})) },
    configurable: true,
  });
  fireEvent.click(document.getElementById("copyBtn"));
  return copied;
}

function results() {
  const doc = document;
  const clean = (node) => node.textContent.replace(/\s+/g, " ").trim();
  const text = (id) => clean(doc.getElementById(id));
  const items = (selector) =>
    [...doc.querySelectorAll(selector)].map(clean).join(" || ");
  const table = (id) =>
    [...doc.querySelectorAll(`#${id} tr`)]
      .map((row) => "  " + [...row.children].map(clean).join(" | "))
      .join("\n");
  return [
    reportOf(),
    "",
    "KPI системы: " + text("systemKpis"),
    "Сводка: " + text("loadSummary"),
    "Легенда: " + items("#legend li"),
    "Датчики: " + text("gauges"),
    "Примечание: " + text("loadNote"),
    "Допущения: " + items("#assumptionsList li"),
    "Сеть:\n" + table("networkTable"),
    "Вердикт: " + text("verdict"),
    "KPI типа: " + text("kpis"),
    "Факты: " + text("facts"),
    "Плотность:\n" + table("densityTable"),
    "Схема:\n" + doc.getElementById("side").innerHTML.replace(/></g, ">\n<"),
  ].join("\n");
}

// Состояние встроенного примера, от него строятся остальные конфигурации.
// Страница сохраняет его в localStorage сразу после первого расчёта.
await openPage();
const example = JSON.parse(localStorage.getItem("camcalc4"));
const [sideType, topType] = example.types;
const withType = (type, changes) => ({
  ...type,
  inputs: { ...type.inputs, ...changes.inputs },
  objects: changes.objects || type.objects,
});

const configs = {
  "Пример, вид сбоку": example,

  "Пример, вид сверху": { ...example, activeTypeId: topType.id },

  "Своя камера и свой детектор": {
    ...example,
    customCameras: [
      {
        id: "mtest",
        name: "Тест-камера 8 Мп",
        Nw: 3840,
        Nh: 2160,
        sensorWidth: 7.68,
        focalMin: 6,
        focalMax: 6,
        price: 300,
      },
    ],
    customModels: [
      {
        id: "dtest",
        name: "Детектор деталей",
        fps: 900,
        inputSize: 640,
        refGpu: "l40s",
        gflops: 0,
      },
    ],
    types: [
      withType(sideType, {
        inputs: { camera: "mtest" },
        objects: [
          sideType.objects[0],
          { ...sideType.objects[1], model: "dtest" },
        ],
      }),
      topType,
    ],
  },

  "Ручной объектив, H.264, запись видео": {
    ...example,
    system: {
      ...example.system,
      efficiency: "0.5",
      reserve: "30",
      archiveDays: "30",
    },
    types: [
      withType(sideType, {
        inputs: {
          lensMode: "focal",
          focalLength: "8",
          orientation: "portrait",
          resolution: "5",
          sensor: "7",
          pixelPitch: "2.0",
          codec: "0.07",
          scene: "1.5",
        },
        objects: [
          {
            ...sideType.objects[0],
            model: "y11m",
            feed: "full",
            inputSize: 1280,
          },
          sideType.objects[1],
        ],
      }),
      topType,
    ],
  },

  "Свои GPU, угол обзора вручную": {
    ...example,
    activeTypeId: topType.id,
    system: { ...example.system, gpu: "cgpu", gpuCount: "2" },
    customGpus: [
      {
        id: "cgpu",
        name: "Своя карта",
        arch: "Ada",
        tflops: 150,
        nvdec: 2,
        memoryGB: 24,
        tdpW: 300,
        price: 2500,
      },
      {
        id: "cjet",
        name: "Свой Jetson",
        arch: "Ampere",
        tflops: 20,
        memoryGB: 16,
        tdpW: 40,
        price: 900,
        jetson: true,
        decodeStreams: { h265: 10, h264: 5.3 },
      },
    ],
    gpuPrices: { l40s: "7000" },
    gpuEnabled: { 5090: false, cjet: true },
    types: [
      sideType,
      withType(topType, { inputs: { lensMode: "angle", hfov: "70" } }),
    ],
  },

  // высота камеры ниже высоты объекта: расчёт типа невозможен
  "Ошибка ввода": {
    ...example,
    types: [withType(sideType, { inputs: { cameraHeight: "0.5" } }), topType],
  },
};

// страницы открываются по очереди: у теста одно окно
test("результаты расчёта совпадают с tests/golden/golden.txt", async () => {
  const sections = [];
  for (const [name, state] of Object.entries(configs)) {
    await openPage({ saved: JSON.stringify(state) });
    sections.push(`===== ${name}\n${results()}\n`);
  }
  await expect(sections.join("\n")).toMatchFileSnapshot("golden.txt");
});
