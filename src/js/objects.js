import { STR, t, withUnit } from "./i18n.js";
import { store } from "./store.js";
import {
  FEEDS,
  INPUTS,
  MODELS,
  RESOLUTIONS,
  SENSORS,
  byId,
  escapeHtml,
  formatNumber,
  parseNum,
} from "./data.js";
import { activeType } from "./state.js";
import { calcAll } from "./system-ui.js";
// ---------- шаблоны камер и детекторов
const BUILTIN_CAMERAS = [
  {
    id: "k4",
    name: STR.builtinCameraNames.k4,
    Nw: 2560,
    Nh: 1440,
    sensorWidth: 5.4,
    focalMin: 2.8,
    focalMax: 12,
  },
  {
    id: "k8",
    name: STR.builtinCameraNames.k8,
    Nw: 3840,
    Nh: 2160,
    sensorWidth: 7.68,
    focalMin: 2.8,
    focalMax: 12,
  },
];
export const allCameras = () => [...BUILTIN_CAMERAS, ...store.customCameras];
export const cameraById = (id) =>
  allCameras().find((camera) => camera.id === id);
export const modelById = (id) =>
  MODELS.find((model) => model.id === id) ||
  store.customDetectors.find((detector) => detector.id === id);
export function buildCameraSelect() {
  const select = byId("camera"),
    current = select.value;
  select.innerHTML =
    `<option value="">${t("cameraManual")}</option>` +
    allCameras()
      .map(
        (camera) =>
          `<option value="${camera.id}">${escapeHtml(camera.name)}</option>`,
      )
      .join("");
  select.value = cameraById(current) ? current : "";
}

// ---------- карточки объектов
export function renderObjects() {
  const type = activeType(),
    list = byId("objectList");
  list.innerHTML = "";
  type.objects.forEach((obj, i) => {
    if (!modelById(obj.model)) obj.model = "y26s";
    const card = document.createElement("article");
    card.className = "ocard";
    const modelOptions =
      `<optgroup label="${t("ultralytics")}">${MODELS.map((model) => `<option value="${model.id}">${model.name}</option>`).join("")}</optgroup>` +
      (store.customDetectors.length
        ? `<optgroup label="${t("customDetectors")}">${store.customDetectors.map((detector) => `<option value="${detector.id}">${escapeHtml(detector.name)}</option>`).join("")}</optgroup>`
        : "");
    card.innerHTML = `<div class="ohdr"><span class="dot" id="objectDot-${i}" aria-hidden="true"></span><input id="objectName-${i}" aria-label="${t("objectName")}"><button type="button" class="odel" aria-label="${t("objectDelete")}">×</button></div>
      <div class="ogrid">
        <div class="f"><label for="objectWidth-${i}">${t("objectWidth")}</label><input id="objectWidth-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectLength-${i}">${t("objectLength")}</label><input id="objectLength-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectHeight-${i}">${t("objectHeight")}</label><input id="objectHeight-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectRequired-${i}">${t("objectRequiredPx")}</label><input id="objectRequired-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f c2"><label for="objectModel-${i}">${t("objectModel")}</label><select id="objectModel-${i}">${modelOptions}</select></div>
        <div class="f"><label for="objectFeed-${i}">${t("objectFeed")}</label><select id="objectFeed-${i}">${Object.entries(
          FEEDS,
        )
          .map(([feed, label]) => `<option value="${feed}">${label}</option>`)
          .join("")}</select></div>
        <div class="f"><label for="objectInput-${i}">${t("objectInput")}</label><select id="objectInput-${i}" style="font-family:var(--mono)">${INPUTS.map((size) => `<option>${size}</option>`).join("")}</select></div>
        <div class="f" id="objectOverlapBox-${i}"><label for="objectOverlap-${i}">${t("objectOverlap")}</label><input id="objectOverlap-${i}" type="number" step="any" inputmode="decimal"></div>
      </div>
      <div class="ores" id="objectResult-${i}" aria-live="polite"></div>`;
    list.append(card);
    // перекрытие задаётся только для тайлов
    const syncOverlapBox = () => {
      byId(`objectOverlapBox-${i}`).hidden = obj.feed !== "tiles";
    };
    [
      ["objectName", "name"],
      ["objectWidth", "width"],
      ["objectLength", "length"],
      ["objectHeight", "height"],
      ["objectRequired", "requiredPx"],
      ["objectOverlap", "overlap"],
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
      ["objectModel", "model"],
      ["objectFeed", "feed"],
      ["objectInput", "inputSize"],
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
export function syncFormUI(type, result) {
  const inputs = type.inputs,
    camera = cameraById(inputs.camera);
  byId("focalLengthBox").hidden = inputs.lensMode !== "focal";
  byId("hfovBox").hidden = inputs.lensMode !== "angle";
  byId("zoneStartBox").hidden = inputs.placement === "top";
  const sensorPreset = (SENSORS[+inputs.sensor] || SENSORS[3])[1];
  byId("resolution").disabled = !!camera;
  byId("sensor").disabled = !!camera;
  byId("pixelPitchBox").hidden = !!camera || sensorPreset !== "pp";
  byId("sensorWidth").readOnly = !!camera || sensorPreset !== null;
  if (result && isFinite(result.s) && (camera || sensorPreset !== null))
    byId("sensorWidth").value = +result.s.toFixed(2);
  byId("summaryGeometry").textContent =
    `${t(inputs.placement === "top" ? "summaryTop" : "summarySide")}, ${withUnit(formatNumber(parseNum(inputs.cameraHeight), 1), "m")}, ${formatNumber(parseNum(inputs.zoneWidth), 1)} × ${withUnit(formatNumber(parseNum(inputs.zoneDepth), 1), "m")}`;
  byId("summaryCamera").textContent =
    (camera
      ? `${camera.Nw} × ${camera.Nh}`
      : (RESOLUTIONS[+inputs.resolution] || RESOLUTIONS[1])[0].split(
          " · ",
        )[0]) +
    (result && !result.err
      ? `, f ${withUnit(formatNumber(result.f, 1), "mm")}`
      : "");
  byId("summaryStream").textContent =
    `${withUnit(formatNumber(parseNum(inputs.fps), 0), "fps")}, ${inputs.codec === "0.04" ? "H.265" : "H.264"}`;
}
