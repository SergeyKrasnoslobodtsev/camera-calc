// Тест-эталон: результаты расчёта для набора конфигураций сравниваются с tests/golden.txt.
// Обновить эталон после намеренного изменения расчёта: node tests/golden.test.js --update
const { JSDOM } = require("jsdom");
const fs = require("fs");
const assert = require("assert");

const html = fs.readFileSync(__dirname + "/../dist/camera-calc.html", "utf8");
const goldenPath = __dirname + "/golden.txt";

function openPage(savedState) {
  return new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://x.test/",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.scrollTo = () => {};
      window.localStorage.setItem("camcalc-lang", "ru");
      if (savedState)
        window.localStorage.setItem("camcalc4", JSON.stringify(savedState));
    },
  }).window;
}

function results(window) {
  const doc = window.document;
  const clean = (node) => node.textContent.replace(/\s+/g, " ").trim();
  const text = (id) => clean(doc.getElementById(id));
  const items = (selector) =>
    [...doc.querySelectorAll(selector)].map(clean).join(" || ");
  const table = (id) =>
    [...doc.querySelectorAll(`#${id} tr`)]
      .map((row) => "  " + [...row.children].map(clean).join(" | "))
      .join("\n");
  return [
    window.eval("report"),
    "",
    "KPI системы: " + text("sysKpis"),
    "Сводка: " + text("dsum"),
    "Легенда: " + items("#legend li"),
    "Датчики: " + text("gauges"),
    "Примечание: " + text("loadNote"),
    "Допущения: " + items("#assList li"),
    "Сеть:\n" + table("netTbl"),
    "Вердикт: " + text("verdict"),
    "KPI типа: " + text("kpis"),
    "Факты: " + text("facts"),
    "Плотность:\n" + table("dens"),
    "Схема:\n" + doc.getElementById("side").innerHTML.replace(/></g, ">\n<"),
  ].join("\n");
}

// Состояние встроенного примера, от него строятся остальные конфигурации.
const example = JSON.parse(openPage().eval("JSON.stringify(snapshot())"));
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
    customDetectors: [
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

const actual = Object.entries(configs)
  .map(([name, state]) => `===== ${name}\n${results(openPage(state))}\n`)
  .join("\n");

if (process.argv.includes("--update")) {
  fs.writeFileSync(goldenPath, actual);
  console.log("golden: эталон обновлён");
} else {
  assert.strictEqual(
    actual,
    fs.readFileSync(goldenPath, "utf8"),
    "результаты расчёта отличаются от tests/golden.txt",
  );
  console.log("golden: ok");
}
