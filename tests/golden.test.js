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
      if (savedState) window.localStorage.setItem("camcalc3", JSON.stringify(savedState));
    },
  }).window;
}

function results(window) {
  const doc = window.document;
  const clean = (node) => node.textContent.replace(/\s+/g, " ").trim();
  const text = (id) => clean(doc.getElementById(id));
  const items = (selector) => [...doc.querySelectorAll(selector)].map(clean).join(" || ");
  const table = (id) =>
    [...doc.querySelectorAll(`#${id} tr`)].map((row) => "  " + [...row.children].map(clean).join(" | ")).join("\n");
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
const example = JSON.parse(openPage().eval("JSON.stringify(snap())"));
const [sideType, topType] = example.types;
const withType = (type, changes) => ({ ...type, v: { ...type.v, ...changes.v }, objs: changes.objs || type.objs });

const configs = {
  "Пример, вид сбоку": example,

  "Пример, вид сверху": { ...example, act: topType.id },

  "Своя камера и свой детектор": {
    ...example,
    cams: [{ id: "mtest", name: "Тест-камера 8 Мп", Nw: 3840, Nh: 2160, sw: 7.68, fmin: 6, fmax: 6, price: 300 }],
    dets: [{ id: "dtest", name: "Детектор деталей", fps: 900, inp: 640, ref: "l40s", gf: 0 }],
    types: [
      withType(sideType, {
        v: { cam: "mtest" },
        objs: [sideType.objs[0], { ...sideType.objs[1], model: "dtest" }],
      }),
      topType,
    ],
  },

  "Ручной объектив, H.264, запись видео": {
    ...example,
    gl: { ...example.gl, kr: "0.5", resv: "30", days: "30" },
    types: [
      withType(sideType, {
        v: { mode: "f", fmm: "8", orient: "port", res: "5", sens: "7", pp: "2.0", codec: "0.07", scene: "1.5" },
        objs: [{ ...sideType.objs[0], model: "y11m", feed: "full", inp: 1280 }, sideType.objs[1]],
      }),
      topType,
    ],
  },

  "Свои GPU, угол обзора вручную": {
    ...example,
    act: topType.id,
    gl: { ...example.gl, gpu: "cgpu", gcnt: "2" },
    custom: [
      { id: "cgpu", name: "Своя карта", arch: "Ada", tf: 150, nvdec: 2, mem: 24, tdp: 300, price: 2500 },
      { id: "cjet", name: "Свой Jetson", arch: "Ampere", tf: 20, mem: 16, tdp: 40, price: 900, jet: true, st: { h265: 10, h264: 5.3 } },
    ],
    price: { l40s: "7000" },
    on: { 5090: false, cjet: true },
    types: [sideType, withType(topType, { v: { mode: "a", hfov: "70" } })],
  },

  // высота камеры ниже высоты объекта: расчёт типа невозможен
  "Ошибка ввода": {
    ...example,
    types: [withType(sideType, { v: { H: "0.5" } }), topType],
  },
};

const actual = Object.entries(configs)
  .map(([name, state]) => `===== ${name}\n${results(openPage(state))}\n`)
  .join("\n");

if (process.argv.includes("--update")) {
  fs.writeFileSync(goldenPath, actual);
  console.log("golden: эталон обновлён");
} else {
  assert.strictEqual(actual, fs.readFileSync(goldenPath, "utf8"), "результаты расчёта отличаются от tests/golden.txt");
  console.log("golden: ok");
}
