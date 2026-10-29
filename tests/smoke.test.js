import { JSDOM, VirtualConsole } from "jsdom";
import fs from "fs";
import assert from "assert";
import { RU } from "../src/i18n/ru.ts";
import { EN } from "../src/i18n/en.ts";
const dom = new JSDOM(
  fs.readFileSync(import.meta.dirname + "/../dist/camera-calc.html", "utf8"),
  {
    runScripts: "dangerously",
    url: "https://x.test/",
    pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.localStorage.setItem("camcalc-lang", "ru");
    },
  },
);
const d = dom.window.document,
  w = dom.window;
w.scrollTo = () => {};
w.addEventListener("error", (e) => console.log("ERR", e.message));
const T = (id) => d.getElementById(id).textContent.replace(/\s+/g, " ").trim();
const tbl = (id) =>
  [...d.querySelectorAll("#" + id + " tr")]
    .map(
      (r) =>
        "   " +
        [...r.children]
          .map((c) => c.textContent.replace(/\s+/g, " ").trim())
          .join(" | "),
    )
    .join("\n");
const go = (h) => {
  w.location.hash = h;
  w.dispatchEvent(new w.HashChangeEvent("hashchange"));
};
const set = (id, v) => (d.getElementById(id).value = v);
const fire = (id, ev = "input") =>
  d.getElementById(id).dispatchEvent(new w.Event(ev, { bubbles: true }));
// отчёт так, как его получает пользователь: кнопка «Копировать отчёт» пишет его в буфер обмена;
// запись не завершается, чтобы уведомление «Отчёт скопирован» не заменило другие
const reportOf = (win) => {
  let copied;
  Object.defineProperty(win.navigator, "clipboard", {
    value: { writeText: (text) => ((copied = text), new Promise(() => {})) },
    configurable: true,
  });
  win.document.getElementById("copyBtn").click();
  return copied;
};
// импорт через поле выбора файла; then вызывается сразу, чтобы проверки шли без ожидания
const importFile = (win, text) => {
  const input = win.document.getElementById("importFile");
  Object.defineProperty(input, "files", {
    value: [{ text: () => ({ then: (onRead) => onRead(text) }) }],
    configurable: true,
  });
  input.dispatchEvent(new win.Event("change"));
};
console.log("SYS:", T("systemKpis"));
console.log("DSUM:", T("loadSummary"));
console.log(
  "DONUT:",
  T("donut"),
  "| circles",
  d.querySelectorAll("#donut circle").length,
);
console.log(
  "LEGEND:",
  [...d.querySelectorAll("#legend li")]
    .map((l) => l.textContent.replace(/\s+/g, " ").trim())
    .join(" || "),
);
console.log("GAUGES:", T("gauges"));
console.log("VERDICT:", T("verdict"));
console.log("FACTS:", T("facts"));
console.log(
  "header btn:",
  T("templatesBtn"),
  d.getElementById("templatesBtn").getAttribute("href"),
);
// templates: cameras
go("#tpl-cams");
console.log(
  "tpl visible",
  !d.getElementById("viewTemplates").hidden,
  "cams",
  !d.getElementById("templatePage-cams").hidden,
  "gpus",
  !d.getElementById("templatePage-gpus").hidden,
);
console.log(tbl("cameraTable"));
set("cameraFormName", "Тест-камера 8 Мп");
set("cameraFormWidth", "3840");
set("cameraFormHeight", "2160");
set("cameraFormPixelPitch", "2");
set("cameraFormFocalMin", "6");
set("cameraFormFocalMax", "6");
set("cameraFormPrice", "300");
d.getElementById("cameraForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("after add cam rows", d.querySelectorAll("#cameraTable tr").length);
// detectors
go("#tpl-dets");
set("detectorFormName", "Детектор деталей");
set("detectorFormFps", "900");
set("detectorFormInput", "640");
set("detectorFormRefGpu", "l40s");
d.getElementById("detectorForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("det first row:", tbl("detectorTable").split("\n")[1]);
d.getElementById("detectorForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("det err:", T("detectorFormError"));
// back to main, apply camera to type 1 and detector to object 2
go("");
const camSel = d.getElementById("camera");
const custom = [...camSel.options].find((o) =>
  o.text.startsWith("Тест-камера"),
);
camSel.value = custom.value;
fire("camera", "change");
console.log(
  "res disabled",
  d.getElementById("resolution").disabled,
  "sw",
  d.getElementById("sensorWidth").value,
);
console.log("VERDICT cam:", T("verdict"));
const om = d.getElementById("objectModel-1");
const det = [...om.options].find((o) => o.text === "Детектор деталей");
om.value = det.value;
om.dispatchEvent(new w.Event("change", { bubbles: true }));
console.log(
  "LEGEND det:",
  [...d.querySelectorAll("#legend li")]
    .map((l) => l.textContent.replace(/\s+/g, " ").trim())
    .join(" || "),
);
console.log("SYS:", T("systemKpis"));
console.log("tips", d.querySelectorAll(".tipbtn").length);
// export → import
let reloads = 0;
const page = (seed, lang = "ru", nav) => {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (/navigation/.test(e.message)) reloads++;
    else console.error(e);
  });
  return new JSDOM(
    fs.readFileSync(import.meta.dirname + "/../dist/camera-calc.html", "utf8"),
    {
      runScripts: "dangerously",
      url: "https://x.test/",
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(w) {
        w.scrollTo = () => {};
        if (seed) w.localStorage.setItem("camcalc4", seed);
        if (lang) w.localStorage.setItem("camcalc-lang", lang);
        if (nav) Object.defineProperty(w.navigator, "language", { value: nav });
      },
    },
  ).window;
};
let blob = null,
  href = "",
  attached = false,
  revoked = [];
w.URL.createObjectURL = (b) => {
  blob = b;
  return "blob:x.test/1";
};
w.URL.revokeObjectURL = (u) => revoked.push(u);
w.HTMLAnchorElement.prototype.click = function () {
  href = this.href;
  attached = this.isConnected;
};
d.getElementById("exportBtn").click();
assert.ok(
  blob instanceof w.Blob && blob.type === "application/json",
  "экспорт: не Blob с JSON",
);
assert.strictEqual(href, "blob:x.test/1", "экспорт: ссылка не на Blob");
assert.ok(attached, "экспорт: ссылка не в документе");
assert.strictEqual(
  d.querySelectorAll("a[download]").length,
  0,
  "экспорт: ссылка осталась в документе",
);
setTimeout(() => {
  assert.deepStrictEqual(
    revoked,
    ["blob:x.test/1"],
    "экспорт: ссылка не освобождена",
  );
  console.log("export revoke: ok");
}, 0);
const ex = JSON.parse(w.localStorage.getItem("camcalc4")),
  exp = JSON.stringify(ex, null, 1);
const fr = new w.FileReader();
fr.readAsText(blob);
fr.onload = () => {
  assert.strictEqual(fr.result, exp, "экспорт: содержимое файла");
  console.log("export content: ok");
};
assert.deepStrictEqual(
  [ex.customCameras.map((c) => c.name), ex.customDetectors.map((x) => x.name)],
  [["Тест-камера 8 Мп"], ["Детектор деталей"]],
  "экспорт: нет своих шаблонов",
);
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
const before = w.localStorage.getItem("camcalc4");
importFile(w, "{битый");
assert.strictEqual(T("toast"), "Файл не является сохранением калькулятора.");
assert.strictEqual(
  w.localStorage.getItem("camcalc4"),
  before,
  "битый файл изменил данные",
);
[
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
].forEach((s) => {
  d.getElementById("toast").textContent = "";
  importFile(w, s);
  assert.strictEqual(
    T("toast"),
    "Файл не является сохранением калькулятора.",
    s,
  );
  assert.strictEqual(
    w.localStorage.getItem("camcalc4"),
    before,
    "файл изменил данные: " + s,
  );
});
let picks = 0;
d.getElementById("importFile").click = () => picks++;
d.getElementById("importBtn").click();
assert.strictEqual(T("importBtn"), "Заменить все данные");
assert.strictEqual(picks, 0, "выбор файла без подтверждения");
d.getElementById("importBtn").click();
assert.strictEqual(picks, 1, "второе нажатие не открыло выбор файла");
assert.strictEqual(T("importBtn"), "Импорт");
const w2 = page();
importFile(w2, exp);
assert.strictEqual(reloads, 1, "импорт не перезагрузил страницу");
const w3 = page(w2.localStorage.getItem("camcalc4")),
  T3 = (id) =>
    w3.document.getElementById(id).textContent.replace(/\s+/g, " ").trim();
assert.ok(
  [...w3.document.getElementById("camera").options].some((o) =>
    o.text.startsWith("Тест-камера"),
  ),
  "после импорта нет своей камеры",
);
assert.strictEqual(
  T3("systemKpis"),
  T("systemKpis"),
  "после импорта другие итоги",
);
assert.strictEqual(reportOf(w3), reportOf(w), "после импорта другой отчёт");
console.log("export/import: ok");
// unreadable file
const inp = d.getElementById("importFile"),
  kept = w.localStorage.getItem("camcalc4");
d.getElementById("toast").textContent = "";
Object.defineProperty(inp, "files", {
  value: [{ text: () => Promise.reject(new Error("NotReadableError")) }],
});
inp.dispatchEvent(new w.Event("change"));
setTimeout(() => {
  assert.strictEqual(T("toast"), "Не удалось прочитать файл.");
  assert.strictEqual(w.localStorage.getItem("camcalc4"), kept);
  console.log("unreadable file: ok");
}, 0);
// invalid select values on load
const w4 = page(
  JSON.stringify({
    ...ex,
    system: { ...ex.system, gpuCount: "8", gpu: "nope" },
  }),
);
assert.deepStrictEqual(
  [
    w4.document.getElementById("gpuCount").value,
    w4.document.getElementById("gpu").value,
  ],
  ["auto", "auto"],
  "недопустимое значение списка после загрузки",
);
console.log("invalid select on load: ok");
// сохранение с недопустимой записью загружается без неё
const w4b = page(
  JSON.stringify({
    ...ex,
    customGpus: [gpuWithoutPrice, { ...gpuWithoutPrice, id: "c2", price: 900 }],
  }),
);
assert.deepStrictEqual(
  [...w4b.document.getElementById("gpu").options]
    .map((o) => o.value)
    .filter((id) => id === "c1" || id === "c2"),
  ["c2"],
  "загрузка: GPU без цены не отброшен или отброшен допустимый",
);
console.log("invalid record on load: ok");
// data changed in another tab
const w5 = page(exp),
  d5 = w5.document,
  other = JSON.stringify({
    ...ex,
    types: [{ ...ex.types[0], name: "Из другой вкладки" }],
  });
w5.localStorage.setItem("camcalc4", other);
w5.dispatchEvent(new w5.StorageEvent("storage", { key: "camcalc4" }));
d5.getElementById("efficiency").value = "0.5";
d5.getElementById("efficiency").dispatchEvent(
  new w5.Event("input", { bubbles: true }),
);
assert.strictEqual(
  w5.localStorage.getItem("camcalc4"),
  other,
  "вкладка затёрла данные другой вкладки",
);
assert.strictEqual(
  d5.getElementById("toast").textContent,
  "Данные изменены в другой вкладке. Обновите страницу.",
);
console.log("stale tab: ok");
// language: en dictionary covers ru
const sameKeys = (a, b, p) =>
  Object.keys(a).forEach((k) => {
    assert.ok(k in b, "нет ключа в EN: " + p + k);
    if (Array.isArray(a[k]))
      assert.strictEqual(b[k].length, a[k].length, "длина в EN: " + p + k);
    else if (a[k] && typeof a[k] === "object")
      sameKeys(a[k], b[k], p + k + ".");
  });
sameKeys(RU, EN, "");
const extraKeys = (a, b, p) =>
  Object.keys(a).flatMap((k) =>
    !(k in b)
      ? [p + k]
      : a[k] && typeof a[k] === "object" && !Array.isArray(a[k])
        ? extraKeys(a[k], b[k], p + k + ".")
        : [],
  );
assert.deepStrictEqual(extraKeys(EN, RU, ""), [], "ключи EN, которых нет в RU");
console.log("en keys: ok");
// language: every key is used in the code or markup, every referenced key exists
const srcDir = import.meta.dirname + "/../src/";
const appCode = ["js", "i18n", "domain"]
  .flatMap((dir) =>
    fs
      .readdirSync(srcDir + dir, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.[jt]s$/.test(file))
      .map((file) => fs.readFileSync(srcDir + dir + "/" + file, "utf8")),
  )
  .join("\n")
  .replace(/^export const (RU|EN)\b[^=]*= \{\n[\s\S]*?^\};/gm, "")
  .replace(/byId\(["'`][^"'`]*["'`]\)/g, "");
const layoutSource = fs.readFileSync(srcDir + "layout.html", "utf8");
const dictKeys = Object.keys(RU).filter((key) => key !== "tips");
const markupKeys = [...layoutSource.matchAll(/data-t[atp]?="([^"]+)"/g)].map(
  (match) => match[1],
);
// a key counts as used when the code has a string with its name: t(cond ? "a" : "b") passes keys as strings;
// a nameKey like "builtinCameraNames.k4" uses its first part
const codeStrings = [
  ...appCode.matchAll(/["'`]([\w$]+)[."'`]|STR\.([\w$]+)/g),
].map((match) => match[1] || match[2]);
assert.deepStrictEqual(
  dictKeys.filter(
    (key) => !markupKeys.includes(key) && !codeStrings.includes(key),
  ),
  [],
  "неиспользуемые ключи словаря",
);
const calledKeys = [...appCode.matchAll(/\bt\("([\w$]+)"/g)].map(
  (match) => match[1],
);
assert.deepStrictEqual(
  [...markupKeys, ...calledKeys].filter((key) => !dictKeys.includes(key)),
  [],
  "ключи, которых нет в словаре",
);
console.log("used keys: ok");
// tips: every tip has a "?" button next to its field (objects: the tip sits in a heading, not in a field)
assert.deepStrictEqual(
  Object.keys(RU.tips).filter(
    (key) =>
      key !== "objects" && !d.querySelector(`.tipbtn[data-key="${key}"]`),
  ),
  [],
  "подсказки без кнопки «?»",
);
console.log("tip buttons: ok");
// notes: an object too small for the camera resolution gets the full hint
const tooSmall = JSON.parse(page(null, "ru").localStorage.getItem("camcalc4"));
tooSmall.types[0].objects[0].width = 8;
[
  ["ru", /^Для «.+» требуется не меньше [\d\s]+\spx по горизонтали \(.+\)/],
  ["en", /^".+" requires at least [\d,]+ px horizontally \(.+\)/],
].forEach(([lang, hint]) => {
  const notes = [
    ...page(JSON.stringify(tooSmall), lang).document.querySelectorAll(
      "#verdict li",
    ),
  ].map((li) => li.textContent);
  assert.ok(
    notes.some((note) => hint.test(note)),
    "нет подсказки о разрешении, " + lang + ": " + notes.join(" | "),
  );
});
console.log("resolution hint: ok");
// language: EN report has no Cyrillic except user names, numbers match RU
const w6 = page(exp, "en"),
  d6 = w6.document;
assert.strictEqual(d6.documentElement.lang, "en");
assert.ok(
  !d6.querySelector("#formulas>[lang=en]").hidden &&
    d6.querySelector("#formulas>[lang=ru]").hidden,
  "EN: не тот блок формул",
);
const builtinRu = [...RU.typeNames, ...RU.presetNames, RU.objDefault];
const userNames = [
  ...ex.types
    .flatMap((T) => [T.name, ...T.objects.map((o) => o.name)])
    .filter((n) => !builtinRu.includes(n)),
  ...ex.customCameras.map((c) => c.name),
  ...ex.customDetectors.map((x) => x.name),
  ...ex.customGpus.map((g) => g.name),
].sort((a, b) => b.length - a.length);
const rEn = reportOf(w6),
  rRu = reportOf(w);
const cyr = userNames
  .reduce((s, n) => s.split(n).join(""), rEn)
  .match(/.*[А-Яа-яЁё].*/g);
assert.strictEqual(cyr, null, "кириллица в EN-отчёте: " + cyr);
const nums = (s, ru) =>
  (ru
    ? s.replace(/(\d)[  ](?=\d)/g, "$1").replace(/(\d),(?=\d)/g, "$1.")
    : s.replace(/(\d),(?=\d)/g, "$1")
  ).match(/\d+(?:\.\d+)?/g);
assert.deepStrictEqual(
  nums(rEn, false),
  nums(rRu, true),
  "числа EN-отчёта не совпадают с RU",
);
console.log("en report: ok");
// language: first open follows browser, choice survives reload
assert.strictEqual(
  page(null, null, "ru-RU").document.documentElement.lang,
  "ru",
  "язык браузера ru не учтён",
);
const w7 = page(null, null),
  r0 = reloads;
assert.strictEqual(w7.document.documentElement.lang, "en");
assert.strictEqual(w7.document.getElementById("langBtn").textContent, "RU");
w7.document.getElementById("langBtn").click();
assert.strictEqual(
  reloads,
  r0 + 1,
  "переключение языка не перезагрузило страницу",
);
const w8 = page(null, w7.localStorage.getItem("camcalc-lang"), "en-US");
assert.strictEqual(
  w8.document.documentElement.lang,
  "ru",
  "выбор языка не сохранился",
);
assert.strictEqual(
  w8.document.getElementById("templatesBtn").textContent,
  "Шаблоны",
);
console.log("lang persists: ok");
// language: example names saved on RU are shown in EN after switching
const w10 = page(page(null, "ru").localStorage.getItem("camcalc4"), "en"),
  d10 = w10.document;
const shown = [
  reportOf(w10),
  d10.getElementById("tabs").textContent,
  d10.getElementById("typeName").value,
  ...[...d10.querySelectorAll("[id^=objectName-]")].map((el) => el.value),
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
console.log("example names follow lang: ok");
// language: a name typed by the user is kept as is, even if it matches a built-in one
const w11 = page(null, "ru");
w11.document.getElementById("typeName").value = "Тележка";
w11.document
  .getElementById("typeName")
  .dispatchEvent(new w11.Event("input", { bubbles: true }));
const d12 = page(w11.localStorage.getItem("camcalc4"), "en").document;
assert.strictEqual(
  d12.getElementById("typeName").value,
  "Тележка",
  "EN: название пользователя переведено",
);
console.log("user names kept: ok");
// numbers: EN price "1,999" is not read as 1.999
const w9 = page(null, "en"),
  d9 = w9.document;
w9.location.hash = "#tpl-gpus";
w9.dispatchEvent(new w9.HashChangeEvent("hashchange"));
d9.getElementById("gpuPrice-l40s").value = "1,999";
d9.getElementById("gpuPrice-l40s").dispatchEvent(
  new w9.Event("input", { bubbles: true }),
);
// при цене 1.999 L40S стала бы самой дешёвой и попала бы в отчёт за $2
assert.notStrictEqual(
  reportOf(w9).match(/× L40S, (\$[\d,]+);/)?.[1],
  "$2",
  "EN: «1,999» прочитано как 1.999",
);
const textNumbers = [...d9.querySelectorAll("input[inputmode]")].filter(
  (el) => el.type !== "number",
);
assert.deepStrictEqual(
  textNumbers.map((el) => el.id),
  [],
  "числовые поля не type=number",
);
console.log("number fields: ok");
// numbers: saved values with a decimal comma load as neutral 1.5
const withNumbers = (H, w, kr) => {
  const st = JSON.parse(exp);
  st.types[0].inputs.cameraHeight = H;
  st.types[0].objects[0].width = w;
  st.system.efficiency = kr;
  return JSON.stringify(st);
};
["ru", "en"].forEach((lang) => {
  const comma = page(withNumbers("4,5", "50,5", "0,5"), lang),
    dot = page(withNumbers("4.5", "50.5", "0.5"), lang);
  assert.strictEqual(
    comma.document.getElementById("cameraHeight").value,
    "4.5",
    lang,
  );
  assert.strictEqual(
    comma.document.getElementById("efficiency").value,
    "0.5",
    lang,
  );
  assert.strictEqual(
    reportOf(comma),
    reportOf(dot),
    "сохранение с запятой: другой отчёт, " + lang,
  );
});
console.log("legacy comma: ok");
// numbers: integer fields reject fractions
const tCount = d9.getElementById("typeCount");
tCount.value = "1.5";
assert.strictEqual(
  tCount.checkValidity(),
  false,
  "количество камер 1.5 прошло",
);
const fractional = [...d9.querySelectorAll('input[inputmode="numeric"]')]
  .filter((el) => el.step !== "1")
  .map((el) => el.id);
assert.deepStrictEqual(fractional, [], "целые поля принимают дробь");
console.log("integer fields: ok");
// input check: min="0" on number fields, errors instead of silent substitution
const noMin = [...d9.querySelectorAll('input[type="number"]')]
  .filter((el) => el.min !== "0")
  .map((el) => el.id);
assert.ok(
  d9.getElementById("gpuPrice-l40s") && d9.getElementById("objectWidth-0"),
  "нет полей цены или объекта",
);
assert.deepStrictEqual(noMin, [], "числовые поля без min=0");
const enter = (win, id, value) => {
  const field = win.document.getElementById(id);
  field.value = value;
  field.dispatchEvent(new win.Event("input", { bubbles: true }));
};
const open = (win, hash) => {
  win.location.hash = hash;
  win.dispatchEvent(new win.HashChangeEvent("hashchange"));
};
[
  ["typeCount", "1.5"],
  ["cameraHeight", "-1"],
].forEach(([id, value]) => {
  const typed = page(null);
  enter(typed, id, value);
  // тот же черновик из сохранения: строка сохраняется, расчёт показывает ошибку
  const loaded = page(typed.localStorage.getItem("camcalc4"));
  [typed, loaded].forEach((win) => {
    assert.strictEqual(win.document.getElementById(id).value, value, id);
    assert.match(
      win.document.getElementById("verdict").textContent,
      new RegExp(RU.pillError),
      `${id} ${value}: вердикт`,
    );
    assert.match(
      reportOf(win),
      /× \d+: ошибка в исходных данных/,
      `${id} ${value}: отчёт`,
    );
  });
});
console.log("type input errors: ok");
[
  ["efficiency", ""],
  ["reserve", "-5"],
  ["gpuPrice-l40s", "-5"],
  ["gpuPrice-l40s", ""],
].forEach(([id, value]) => {
  const win = page(null);
  open(win, "#tpl-gpus");
  enter(win, id, value);
  open(win, "");
  assert.strictEqual(
    win.document.getElementById("loadNote").textContent,
    RU.systemInputError,
    `${id} «${value}»: системный блок`,
  );
  const report = reportOf(win);
  assert.ok(report.includes(RU.reportComputeError), `${id} «${value}»: отчёт`);
  assert.ok(
    !/Вычислитель \(оценка\): \d+ ×/.test(report),
    `${id} «${value}»: подбор`,
  );
});
console.log("system input errors: ok");
const camForm = page(null);
open(camForm, "#tpl-cams");
const cameraRows = () =>
  camForm.document.querySelectorAll("#cameraTable tr").length;
const rowsBefore = cameraRows();
enter(camForm, "cameraFormName", "Дробный кадр");
enter(camForm, "cameraFormWidth", "1920.5");
enter(camForm, "cameraFormHeight", "1080");
enter(camForm, "cameraFormSensorWidth", "5.6");
camForm.document
  .getElementById("cameraForm")
  .dispatchEvent(new camForm.Event("submit", { cancelable: true }));
assert.strictEqual(
  cameraRows(),
  rowsBefore,
  "камера с дробным кадром добавлена",
);
assert.strictEqual(
  camForm.document.getElementById("cameraFormError").textContent,
  RU.cameraFormError(RU.errorFrame),
  "нет ошибки дробного кадра",
);
console.log("template fraction: ok");
