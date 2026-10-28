const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(
  fs.readFileSync(__dirname + "/../dist/camera-calc.html", "utf8"),
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
console.log("SYS:", T("sysKpis"));
console.log("DSUM:", T("dsum"));
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
  T("tplBtn"),
  d.getElementById("tplBtn").getAttribute("href"),
);
// templates: cameras
go("#tpl-cams");
console.log(
  "tpl visible",
  !d.getElementById("viewTpl").hidden,
  "cams",
  !d.getElementById("tpl-cams-v").hidden,
  "gpus",
  !d.getElementById("tpl-gpus-v").hidden,
);
console.log(tbl("camTbl"));
set("ncName", "Тест-камера 8 Мп");
set("ncW", "3840");
set("ncH", "2160");
set("ncPp", "2");
set("ncFmin", "6");
set("ncFmax", "6");
set("ncPrice", "300");
d.getElementById("camForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("after add cam rows", d.querySelectorAll("#camTbl tr").length);
// detectors
go("#tpl-dets");
set("ndName", "Детектор деталей");
set("ndFps", "900");
set("ndInp", "640");
set("ndRef", "l40s");
d.getElementById("detForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("det first row:", tbl("detTbl").split("\n")[1]);
d.getElementById("detForm").dispatchEvent(
  new w.Event("submit", { cancelable: true }),
);
console.log("det err:", T("ndErr"));
// back to main, apply camera to type 1 and detector to object 2
go("");
const camSel = d.getElementById("cam");
const custom = [...camSel.options].find((o) =>
  o.text.startsWith("Тест-камера"),
);
camSel.value = custom.value;
fire("cam", "change");
console.log(
  "res disabled",
  d.getElementById("res").disabled,
  "sw",
  d.getElementById("sw").value,
);
console.log("VERDICT cam:", T("verdict"));
const om = d.getElementById("om-1");
const det = [...om.options].find((o) => o.text === "Детектор деталей");
om.value = det.value;
om.dispatchEvent(new w.Event("change", { bubbles: true }));
console.log(
  "LEGEND det:",
  [...d.querySelectorAll("#legend li")]
    .map((l) => l.textContent.replace(/\s+/g, " ").trim())
    .join(" || "),
);
console.log("SYS:", T("sysKpis"));
console.log("tips", d.querySelectorAll(".tipbtn").length);
// export → import
const assert = require("assert");
let reloads = 0;
const page = (seed, lang = "ru", nav) => {
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    if (/navigation/.test(e.message)) reloads++;
    else console.error(e);
  });
  return new JSDOM(
    fs.readFileSync(__dirname + "/../dist/camera-calc.html", "utf8"),
    {
      runScripts: "dangerously",
      url: "https://x.test/",
      pretendToBeVisual: true,
      virtualConsole: vc,
      beforeParse(w) {
        w.scrollTo = () => {};
        if (seed) w.localStorage.setItem("camcalc3", seed);
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
d.getElementById("expBtn").click();
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
const exp = w.eval("JSON.stringify(snap(),null,1)"),
  ex = JSON.parse(exp);
const fr = new w.FileReader();
fr.readAsText(blob);
fr.onload = () => {
  assert.strictEqual(fr.result, exp, "экспорт: содержимое файла");
  console.log("export content: ok");
};
assert.deepStrictEqual(
  [ex.cams.map((c) => c.name), ex.dets.map((x) => x.name)],
  [["Тест-камера 8 Мп"], ["Детектор деталей"]],
  "экспорт: нет своих шаблонов",
);
const before = w.localStorage.getItem("camcalc3");
w.importText("{битый");
assert.strictEqual(T("toast"), "Файл не является сохранением калькулятора.");
assert.strictEqual(
  w.localStorage.getItem("camcalc3"),
  before,
  "битый файл изменил данные",
);
[
  '{"types":[null]}',
  '{"types":[]}',
  "{}",
  JSON.stringify({ ...ex, types: [{ name: "Тип", objs: "x" }] }),
  JSON.stringify({ types: ex.types }),
].forEach((s) => {
  d.getElementById("toast").textContent = "";
  w.importText(s);
  assert.strictEqual(
    T("toast"),
    "Файл не является сохранением калькулятора.",
    s,
  );
  assert.strictEqual(
    w.localStorage.getItem("camcalc3"),
    before,
    "файл изменил данные: " + s,
  );
});
let picks = 0;
d.getElementById("impFile").click = () => picks++;
d.getElementById("impBtn").click();
assert.strictEqual(T("impBtn"), "Заменить все данные");
assert.strictEqual(picks, 0, "выбор файла без подтверждения");
d.getElementById("impBtn").click();
assert.strictEqual(picks, 1, "второе нажатие не открыло выбор файла");
assert.strictEqual(T("impBtn"), "Импорт");
const w2 = page();
w2.importText(exp);
assert.strictEqual(reloads, 1, "импорт не перезагрузил страницу");
const w3 = page(w2.localStorage.getItem("camcalc3")),
  T3 = (id) =>
    w3.document.getElementById(id).textContent.replace(/\s+/g, " ").trim();
assert.ok(
  [...w3.document.getElementById("cam").options].some((o) =>
    o.text.startsWith("Тест-камера"),
  ),
  "после импорта нет своей камеры",
);
assert.strictEqual(T3("sysKpis"), T("sysKpis"), "после импорта другие итоги");
assert.strictEqual(
  w3.eval("report"),
  w.eval("report"),
  "после импорта другой отчёт",
);
console.log("export/import: ok");
// unreadable file
const inp = d.getElementById("impFile"),
  kept = w.localStorage.getItem("camcalc3");
d.getElementById("toast").textContent = "";
Object.defineProperty(inp, "files", {
  value: [{ text: () => Promise.reject(new Error("NotReadableError")) }],
});
inp.dispatchEvent(new w.Event("change"));
setTimeout(() => {
  assert.strictEqual(T("toast"), "Не удалось прочитать файл.");
  assert.strictEqual(w.localStorage.getItem("camcalc3"), kept);
  console.log("unreadable file: ok");
}, 0);
// invalid select values on load
const w4 = page(
  JSON.stringify({ ...ex, gl: { ...ex.gl, gcnt: "8", gpu: "nope" } }),
);
assert.deepStrictEqual(
  [
    w4.document.getElementById("gcnt").value,
    w4.document.getElementById("gpu").value,
  ],
  ["auto", "auto"],
  "недопустимое значение списка после загрузки",
);
console.log("invalid select on load: ok");
// data changed in another tab
const w5 = page(exp),
  d5 = w5.document,
  other = JSON.stringify({
    ...ex,
    types: [{ ...ex.types[0], name: "Из другой вкладки" }],
  });
w5.localStorage.setItem("camcalc3", other);
w5.dispatchEvent(new w5.StorageEvent("storage", { key: "camcalc3" }));
d5.getElementById("kr").value = "0.5";
d5.getElementById("kr").dispatchEvent(new w5.Event("input", { bubbles: true }));
assert.strictEqual(
  w5.localStorage.getItem("camcalc3"),
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
sameKeys(w.eval("RU"), w.eval("EN"), "");
console.log("en keys: ok");
// language: EN report has no Cyrillic except user names, numbers match RU
const w6 = page(exp, "en"),
  d6 = w6.document;
assert.strictEqual(d6.documentElement.lang, "en");
assert.ok(
  !d6.querySelector("#formulas>[lang=en]").hidden &&
    d6.querySelector("#formulas>[lang=ru]").hidden,
  "EN: не тот блок формул",
);
const builtinRu = [
  ...w.eval("[...RU.typeNames, ...RU.presetNames, RU.objDefault]"),
];
const userNames = [
  ...ex.types
    .flatMap((T) => [T.name, ...T.objs.map((o) => o.name)])
    .filter((n) => !builtinRu.includes(n)),
  ...ex.cams.map((c) => c.name),
  ...ex.dets.map((x) => x.name),
  ...ex.custom.map((g) => g.name),
].sort((a, b) => b.length - a.length);
const rEn = w6.eval("report"),
  rRu = w.eval("report");
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
assert.strictEqual(w8.document.getElementById("tplBtn").textContent, "Шаблоны");
console.log("lang persists: ok");
// language: example names saved on RU are shown in EN after switching
const w10 = page(page(null, "ru").localStorage.getItem("camcalc3"), "en"),
  d10 = w10.document;
const shown = [
  w10.eval("report"),
  d10.getElementById("tabs").textContent,
  d10.getElementById("tName").value,
  ...[...d10.querySelectorAll("[id^=on-]")].map((el) => el.value),
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
// numbers: EN price "1,999" is not read as 1.999
const w9 = page(null, "en"),
  d9 = w9.document;
w9.location.hash = "#tpl-gpus";
w9.dispatchEvent(new w9.HashChangeEvent("hashchange"));
d9.getElementById("pr-l40s").value = "1,999";
d9.getElementById("pr-l40s").dispatchEvent(
  new w9.Event("input", { bubbles: true }),
);
assert.notStrictEqual(
  w9.eval('priceOf(gpuById("l40s"))'),
  1.999,
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
  st.types[0].v.H = H;
  st.types[0].objs[0].w = w;
  st.gl.kr = kr;
  return JSON.stringify(st);
};
["ru", "en"].forEach((lang) => {
  const comma = page(withNumbers("4,5", "50,5", "0,5"), lang),
    dot = page(withNumbers("4.5", "50.5", "0.5"), lang);
  assert.strictEqual(comma.document.getElementById("H").value, "4.5", lang);
  assert.strictEqual(comma.document.getElementById("kr").value, "0.5", lang);
  assert.strictEqual(
    comma.eval("report"),
    dot.eval("report"),
    "сохранение с запятой: другой отчёт, " + lang,
  );
});
console.log("legacy comma: ok");
// numbers: integer fields reject fractions
const tCount = d9.getElementById("tCount");
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
