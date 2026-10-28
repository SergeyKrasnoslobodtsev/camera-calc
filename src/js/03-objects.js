// ---------- шаблоны камер и детекторов
const BUILTIN_CAMERAS = [
  {
    id: "k4",
    name: STR.camBuiltin.k4,
    Nw: 2560,
    Nh: 1440,
    sensorWidth: 5.4,
    focalMin: 2.8,
    focalMax: 12,
  },
  {
    id: "k8",
    name: STR.camBuiltin.k8,
    Nw: 3840,
    Nh: 2160,
    sensorWidth: 7.68,
    focalMin: 2.8,
    focalMax: 12,
  },
];
let customCameras = [],
  customDetectors = [];
const allCameras = () => [...BUILTIN_CAMERAS, ...customCameras];
const cameraById = (id) => allCameras().find((camera) => camera.id === id);
const modelById = (id) =>
  MODELS.find((model) => model.id === id) ||
  customDetectors.find((detector) => detector.id === id);
function buildCameraSelect() {
  const select = byId("camera"),
    current = select.value;
  select.innerHTML =
    `<option value="">${t("camManual")}</option>` +
    allCameras()
      .map(
        (camera) =>
          `<option value="${camera.id}">${escapeHtml(camera.name)}</option>`,
      )
      .join("");
  select.value = cameraById(current) ? current : "";
}

// ---------- карточки объектов
function renderObjects() {
  const type = activeType(),
    list = byId("objList");
  list.innerHTML = "";
  type.objects.forEach((obj, i) => {
    if (!modelById(obj.model)) obj.model = "y26s";
    const card = document.createElement("article");
    card.className = "ocard";
    const modelOptions =
      `<optgroup label="${t("ultralytics")}">${MODELS.map((model) => `<option value="${model.id}">${model.name}</option>`).join("")}</optgroup>` +
      (customDetectors.length
        ? `<optgroup label="${t("ownDets")}">${customDetectors.map((detector) => `<option value="${detector.id}">${escapeHtml(detector.name)}</option>`).join("")}</optgroup>`
        : "");
    card.innerHTML = `<div class="ohdr"><span class="dot" id="obj-dot-${i}" aria-hidden="true"></span><input id="obj-name-${i}" aria-label="${t("objName")}"><button type="button" class="odel" aria-label="${t("objDel")}">×</button></div>
      <div class="ogrid">
        <div class="f"><label for="obj-width-${i}">${t("ow")}</label><input id="obj-width-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="obj-length-${i}">${t("od")}</label><input id="obj-length-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="obj-height-${i}">${t("oz")}</label><input id="obj-height-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="obj-required-${i}">${t("oq")}</label><input id="obj-required-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f c2"><label for="obj-model-${i}">${t("om")}</label><select id="obj-model-${i}">${modelOptions}</select></div>
        <div class="f"><label for="obj-feed-${i}">${t("of")}</label><select id="obj-feed-${i}">${Object.entries(
          FEEDS,
        )
          .map(([feed, label]) => `<option value="${feed}">${label}</option>`)
          .join("")}</select></div>
        <div class="f"><label for="obj-input-${i}">${t("oi")}</label><select id="obj-input-${i}" style="font-family:var(--mono)">${INPUTS.map((size) => `<option>${size}</option>`).join("")}</select></div>
        <div class="f" id="obj-overlap-box-${i}"><label for="obj-overlap-${i}">${t("ov")}</label><input id="obj-overlap-${i}" type="number" step="any" inputmode="decimal"></div>
      </div>
      <div class="ores" id="obj-result-${i}" aria-live="polite"></div>`;
    list.append(card);
    // перекрытие задаётся только для тайлов
    const syncOverlapBox = () => {
      byId(`obj-overlap-box-${i}`).hidden = obj.feed !== "tiles";
    };
    [
      ["obj-name", "name"],
      ["obj-width", "width"],
      ["obj-length", "length"],
      ["obj-height", "height"],
      ["obj-required", "requiredPx"],
      ["obj-overlap", "overlap"],
    ].forEach(([idPrefix, field]) => {
      const input = byId(`${idPrefix}-${i}`);
      input.value = obj[field] ?? "";
      input.addEventListener("input", (event) => {
        event.stopPropagation();
        obj[field] = event.target.value;
        if (field === "name") delete obj.nameKey;
        calcAll();
      });
    });
    [
      ["obj-model", "model"],
      ["obj-feed", "feed"],
      ["obj-input", "inputSize"],
    ].forEach(([idPrefix, field]) => {
      const select = byId(`${idPrefix}-${i}`);
      select.value = String(obj[field]);
      if (select.selectedIndex < 0) select.selectedIndex = 0;
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        obj[field] = event.target.value;
        syncOverlapBox();
        calcAll();
      });
    });
    card.querySelector(".odel").addEventListener("click", () => {
      type.objects.splice(i, 1);
      renderObjects();
      calcAll();
    });
    syncOverlapBox();
  });
}
function syncFormUI(type, result) {
  const inputs = type.inputs,
    camera = cameraById(inputs.camera);
  byId("fBox").hidden = inputs.lensMode !== "focal";
  byId("aBox").hidden = inputs.lensMode !== "angle";
  byId("L0box").hidden = inputs.placement === "top";
  const sensorPreset = (SENSORS[+inputs.sensor] || SENSORS[3])[1];
  byId("resolution").disabled = !!camera;
  byId("sensor").disabled = !!camera;
  byId("ppBox").hidden = !!camera || sensorPreset !== "pp";
  byId("sensorWidth").readOnly = !!camera || sensorPreset !== null;
  if (result && isFinite(result.s) && (camera || sensorPreset !== null))
    byId("sensorWidth").value = +result.s.toFixed(2);
  byId("sumGeo").textContent =
    `${t(inputs.placement === "top" ? "sumTop" : "sumSide")}, ${withUnit(formatNumber(parseNum(inputs.cameraHeight), 1), "m")}, ${formatNumber(parseNum(inputs.zoneWidth), 1)} × ${withUnit(formatNumber(parseNum(inputs.zoneDepth), 1), "m")}`;
  byId("sumCam").textContent =
    (camera
      ? `${camera.Nw} × ${camera.Nh}`
      : (RESOLUTIONS[+inputs.resolution] || RESOLUTIONS[1])[0].split(
          " · ",
        )[0]) +
    (result && !result.err
      ? `, f ${withUnit(formatNumber(result.f, 1), "mm")}`
      : "");
  byId("sumStr").textContent =
    `${withUnit(formatNumber(parseNum(inputs.fps), 0), "fps")}, ${inputs.codec === "0.04" ? "H.265" : "H.264"}`;
}
