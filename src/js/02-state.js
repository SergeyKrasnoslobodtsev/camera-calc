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
const mkObj = ([
  name,
  width,
  length,
  height,
  requiredPx,
  model,
  feed,
  inputSize,
  nameKey,
]) => ({
  name,
  nameKey,
  width,
  length,
  height,
  requiredPx,
  model,
  feed,
  inputSize,
  overlap: 20,
  fps: 300,
  ref: "5090",
});
const FIELDS = [
  "camera",
  "cameraHeight",
  "planeHeight",
  "zoneStart",
  "zoneDepth",
  "zoneWidth",
  "margin",
  "resolution",
  "sensor",
  "sensorWidth",
  "pixelPitch",
  "orientation",
  "focalLength",
  "hfov",
  "fps",
  "analyticsFps",
  "codec",
  "scene",
  "lensFactor",
  "speed",
  "blurPx",
];
const DEF_V = {
  camera: "",
  cameraHeight: "4",
  planeHeight: "0.9",
  zoneStart: "1.5",
  zoneDepth: "3",
  zoneWidth: "3",
  margin: "10",
  resolution: "1",
  sensor: "3",
  sensorWidth: "5.4",
  pixelPitch: "2.0",
  orientation: "auto",
  focalLength: "6",
  hfov: "50",
  fps: "12",
  analyticsFps: "5",
  codec: "0.04",
  scene: "1",
  lensFactor: "0.6",
  speed: "1",
  blurPx: "2",
  lensMode: "auto",
  placement: "side",
};
const mkType = (name, count, over, objects, nameKey) => ({
  id: uid(),
  name,
  nameKey,
  count: String(count),
  inputs: { ...DEF_V, ...over },
  objects: objects.map(mkObj),
});
const defTypes = () => [
  mkType(STR.typeNames[0], 10, {}, [PRESETS[0], PRESETS[1]], "typeNames.0"),
  mkType(
    STR.typeNames[1],
    10,
    {
      placement: "top",
      cameraHeight: "2.6",
      planeHeight: "1.1",
      zoneDepth: "0.8",
      zoneWidth: "1.4",
      analyticsFps: "2",
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
RESOLUTIONS.forEach((r, i) => byId("resolution").add(new Option(r[0], i)));
SENSORS.forEach((s, i) =>
  byId("sensor").add(
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
    byId(id).value = T.inputs[id] ?? DEF_V[id];
  });
  const md =
    document.querySelector(
      `input[name="lensMode"][value="${T.inputs.lensMode}"]`,
    ) || byId("mAuto");
  md.checked = true;
  const ps =
    document.querySelector(
      `input[name="placement"][value="${T.inputs.placement}"]`,
    ) || byId("pSide");
  ps.checked = true;
  renderObjs();
}
function readForm() {
  const T = act();
  if (T.name !== byId("tName").value) delete T.nameKey;
  T.name = byId("tName").value;
  T.count = byId("tCount").value;
  FIELDS.forEach((id) => {
    T.inputs[id] = byId(id).value;
  });
  T.inputs.lensMode =
    (document.querySelector('input[name="lensMode"]:checked') || {}).value ||
    "auto";
  T.inputs.placement =
    (document.querySelector('input[name="placement"]:checked') || {}).value ||
    "side";
}
