// ---------- состояние
const PRESETS = [
  [50, 30, 170, 32, "y26s", "roi", 640],
  [9, 18, 4, 20, "y26s", "tiles", 640],
  [8, 8, 2, 20, "y26s", "roi", 640],
  [25, 6, 6, 20, "y26s", "roi", 640],
  [1.3, 1.3, 0.7, 10, "y26s", "tiles", 640],
].map((p, i) => [STR.presetNames[i], ...p, `presetNames.${i}`]);
// встроенное название на текущем языке по ключу словаря, например "presetNames.0";
// ключ есть, пока пользователь не изменил название
const builtinName = (key) => {
  const v = String(key)
    .split(".")
    .reduce((v, k) => v?.[k], STR);
  return typeof v === "string" ? v : undefined;
};
const mkObj = ([name, w, d, z, req, model, feed, inp, nameKey]) => ({
  name,
  nameKey,
  w,
  d,
  z,
  req,
  model,
  feed,
  inp,
  ov: 20,
  fps: 300,
  ref: "5090",
});
const FIELDS = [
  "cam",
  "H",
  "h",
  "L0",
  "Dz",
  "Wz",
  "mg",
  "res",
  "sens",
  "sw",
  "pp",
  "orient",
  "fmm",
  "hfov",
  "fps",
  "afps",
  "codec",
  "scene",
  "k",
  "v",
  "blur",
];
const DEF_V = {
  cam: "",
  H: "4",
  h: "0.9",
  L0: "1.5",
  Dz: "3",
  Wz: "3",
  mg: "10",
  res: "1",
  sens: "3",
  sw: "5.4",
  pp: "2.0",
  orient: "auto",
  fmm: "6",
  hfov: "50",
  fps: "12",
  afps: "5",
  codec: "0.04",
  scene: "1",
  k: "0.6",
  v: "1",
  blur: "2",
  mode: "auto",
  pos: "side",
};
const mkType = (name, count, over, objs, nameKey) => ({
  id: uid(),
  name,
  nameKey,
  count: String(count),
  v: { ...DEF_V, ...over },
  objs: objs.map(mkObj),
});
const defTypes = () => [
  mkType(STR.typeNames[0], 10, {}, [PRESETS[0], PRESETS[1]], "typeNames.0"),
  mkType(
    STR.typeNames[1],
    10,
    {
      pos: "top",
      H: "2.6",
      h: "1.1",
      Dz: "0.8",
      Wz: "1.4",
      afps: "2",
      fps: "10",
    },
    [PRESETS[2]],
    "typeNames.1",
  ),
];
let TYPES = defTypes(),
  ACT = TYPES[0].id;
const act = () => TYPES.find((t) => t.id === ACT) || TYPES[0];

// ---------- форма ↔ тип
RESOLUTIONS.forEach((r, i) => byId("res").add(new Option(r[0], i)));
SENSORS.forEach((s, i) =>
  byId("sens").add(
    new Option(
      typeof s[1] === "number"
        ? t("sensMm", s[0], formatNumber(s[1], 1))
        : s[1] === "pp"
          ? t("sensPp")
          : t("sensOwn"),
      i,
    ),
  ),
);
function writeForm(T) {
  byId("tName").value = T.name;
  byId("tCount").value = T.count;
  FIELDS.forEach((id) => {
    byId(id).value = T.v[id] ?? DEF_V[id];
  });
  const md =
    document.querySelector(`input[name="mode"][value="${T.v.mode}"]`) ||
    byId("mAuto");
  md.checked = true;
  const ps =
    document.querySelector(`input[name="pos"][value="${T.v.pos}"]`) ||
    byId("pSide");
  ps.checked = true;
  renderObjs();
}
function readForm() {
  const T = act();
  if (T.name !== byId("tName").value) delete T.nameKey;
  T.name = byId("tName").value;
  T.count = byId("tCount").value;
  FIELDS.forEach((id) => {
    T.v[id] = byId(id).value;
  });
  T.v.mode =
    (document.querySelector('input[name="mode"]:checked') || {}).value ||
    "auto";
  T.v.pos =
    (document.querySelector('input[name="pos"]:checked') || {}).value || "side";
}
