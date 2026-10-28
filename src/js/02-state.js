// ---------- состояние
const OBJECT_PRESETS = [
  [50, 30, 170, 32, "y26s", "roi", 640],
  [9, 18, 4, 20, "y26s", "tiles", 640],
  [8, 8, 2, 20, "y26s", "roi", 640],
  [25, 6, 6, 20, "y26s", "roi", 640],
  [1.3, 1.3, 0.7, 10, "y26s", "tiles", 640],
].map((preset, i) => [STR.presetNames[i], ...preset, `presetNames.${i}`]);
// встроенное название на текущем языке по ключу словаря, например "presetNames.0";
// ключ есть, пока пользователь не изменил название
const builtinName = (key) => {
  const value = String(key)
    .split(".")
    .reduce((node, part) => node?.[part], STR);
  return typeof value === "string" ? value : undefined;
};
const makeObject = ([
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
const INPUT_IDS = [
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
const DEFAULT_INPUTS = {
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
const makeType = (name, count, overrides, objects, nameKey) => ({
  id: uid(),
  name,
  nameKey,
  count: String(count),
  inputs: { ...DEFAULT_INPUTS, ...overrides },
  objects: objects.map(makeObject),
});
const exampleTypes = () => [
  makeType(
    STR.typeNames[0],
    10,
    {},
    [OBJECT_PRESETS[0], OBJECT_PRESETS[1]],
    "typeNames.0",
  ),
  makeType(
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
    [OBJECT_PRESETS[2]],
    "typeNames.1",
  ),
];
let cameraTypes = exampleTypes(),
  activeTypeId = cameraTypes[0].id;
const activeType = () =>
  cameraTypes.find((type) => type.id === activeTypeId) || cameraTypes[0];

// ---------- форма ↔ тип
RESOLUTIONS.forEach(([label], i) =>
  byId("resolution").add(new Option(label, i)),
);
SENSORS.forEach(([label, width], i) =>
  byId("sensor").add(
    new Option(
      typeof width === "number"
        ? t("sensMm", label, formatNumber(width, 1))
        : width === "pp"
          ? t("sensPp")
          : t("sensOwn"),
      i,
    ),
  ),
);
function writeForm(type) {
  byId("tName").value = type.name;
  byId("tCount").value = type.count;
  INPUT_IDS.forEach((id) => {
    byId(id).value = type.inputs[id] ?? DEFAULT_INPUTS[id];
  });
  const lensModeRadio =
    document.querySelector(
      `input[name="lensMode"][value="${type.inputs.lensMode}"]`,
    ) || byId("mAuto");
  lensModeRadio.checked = true;
  const placementRadio =
    document.querySelector(
      `input[name="placement"][value="${type.inputs.placement}"]`,
    ) || byId("pSide");
  placementRadio.checked = true;
  renderObjects();
}
function readForm() {
  const type = activeType();
  if (type.name !== byId("tName").value) delete type.nameKey;
  type.name = byId("tName").value;
  type.count = byId("tCount").value;
  INPUT_IDS.forEach((id) => {
    type.inputs[id] = byId(id).value;
  });
  type.inputs.lensMode =
    (document.querySelector('input[name="lensMode"]:checked') || {}).value ||
    "auto";
  type.inputs.placement =
    (document.querySelector('input[name="placement"]:checked') || {}).value ||
    "side";
}
