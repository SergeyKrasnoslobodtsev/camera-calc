import { STR, displayName, formatNumber, t, withUnit } from "../i18n/index.ts";
import { feedText, modelPxText, sensorPxText } from "../i18n/domain-text.ts";
import { parseNum } from "../domain/parse-num.ts";
import { MODELS } from "../domain/references/models.ts";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from "../domain/references/resolutions.ts";
import { DEFAULT_SENSOR, SENSORS } from "../domain/references/sensors.ts";
import { NEW_OBJECT, OBJECT_PRESETS } from "../app/examples.ts";
import {
  activeResult,
  activeType,
  addObject,
  allCameras,
  cameraById,
  deleteObject,
  state,
  updateObject,
  type TypeDraft,
  type TypeOutcome,
} from "../app/store.ts";
import { byId, escapeHtml, type Field } from "./dom.ts";
// размеры входа модели, px
export const INPUTS = [320, 416, 512, 640, 768, 960, 1024, 1280];
// ---------- шаблоны камер
export function buildCameraSelect() {
  const select = byId<HTMLSelectElement>("camera"),
    current = select.value;
  select.innerHTML =
    `<option value="">${t("cameraManual")}</option>` +
    allCameras()
      .map(
        (camera) =>
          `<option value="${camera.id}">${escapeHtml(displayName(camera))}</option>`,
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
    const card = document.createElement("article");
    card.className = "ocard";
    const modelOptions =
      `<optgroup label="${t("ultralytics")}">${MODELS.map((model) => `<option value="${model.id}">${model.name}</option>`).join("")}</optgroup>` +
      (state.customDetectors.length
        ? `<optgroup label="${t("customDetectors")}">${state.customDetectors.map((detector) => `<option value="${detector.id}">${escapeHtml(detector.name)}</option>`).join("")}</optgroup>`
        : "");
    card.innerHTML = `<div class="ohdr"><span class="dot" id="objectDot-${i}" aria-hidden="true"></span><input id="objectName-${i}" aria-label="${t("objectName")}"><button type="button" class="odel" aria-label="${t("objectDelete")}">×</button></div>
      <div class="ogrid">
        <div class="f"><label for="objectWidth-${i}">${t("objectWidth")}</label><input id="objectWidth-${i}" type="number" min="0" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectLength-${i}">${t("objectLength")}</label><input id="objectLength-${i}" type="number" min="0" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectHeight-${i}">${t("objectHeight")}</label><input id="objectHeight-${i}" type="number" min="0" step="any" inputmode="decimal"></div>
        <div class="f"><label for="objectRequired-${i}">${t("objectRequiredPx")}</label><input id="objectRequired-${i}" type="number" min="0" step="any" inputmode="decimal"></div>
        <div class="f c2"><label for="objectModel-${i}">${t("objectModel")}</label><select id="objectModel-${i}">${modelOptions}</select></div>
        <div class="f"><label for="objectFeed-${i}">${t("objectFeed")}</label><select id="objectFeed-${i}">${Object.entries(
          STR.feeds,
        )
          .map(([feed, label]) => `<option value="${feed}">${label}</option>`)
          .join("")}</select></div>
        <div class="f"><label for="objectInput-${i}">${t("objectInput")}</label><select id="objectInput-${i}" style="font-family:var(--mono)">${INPUTS.map((size) => `<option>${size}</option>`).join("")}</select></div>
        <div class="f" id="objectOverlapBox-${i}"><label for="objectOverlap-${i}">${t("objectOverlap")}</label><input id="objectOverlap-${i}" type="number" min="0" step="any" inputmode="decimal"></div>
      </div>
      <div class="ores" id="objectResult-${i}" aria-live="polite"></div>`;
    list.append(card);
    // перекрытие задаётся только для тайлов
    const syncOverlapBox = () => {
      byId(`objectOverlapBox-${i}`).hidden = obj.feed !== "tiles";
    };
    (
      [
        ["objectName", "name"],
        ["objectWidth", "width"],
        ["objectLength", "length"],
        ["objectHeight", "height"],
        ["objectRequired", "requiredPx"],
        ["objectOverlap", "overlap"],
      ] as const
    ).forEach(([idPrefix, field]) => {
      const input = byId<HTMLInputElement>(`${idPrefix}-${i}`);
      input.value =
        field === "name" ? displayName(obj) : String(obj[field] ?? "");
      input.addEventListener("input", (event) => {
        event.stopPropagation();
        updateObject(i, field, input.value);
      });
    });
    (
      [
        ["objectModel", "model"],
        ["objectFeed", "feed"],
        ["objectInput", "inputSize"],
      ] as const
    ).forEach(([idPrefix, field]) => {
      const select = byId<HTMLSelectElement>(`${idPrefix}-${i}`);
      select.value = String(obj[field]);
      if (select.selectedIndex < 0) select.selectedIndex = 0;
      select.addEventListener("change", (event) => {
        event.stopPropagation();
        updateObject(i, field, select.value);
        syncOverlapBox();
      });
    });
    card.querySelector(".odel")!.addEventListener("click", () => {
      deleteObject(i);
      renderObjects();
    });
    syncOverlapBox();
  });
  renderObjectResults(activeResult());
}
const capitalize = (text: string) =>
  text ? text[0].toUpperCase() + text.slice(1) : text;
// результат каждого объекта в его карточке
export function renderObjectResults(result: TypeOutcome) {
  if (!result.ok) return;
  result.objects.forEach((item, i) => {
    const resultEl = byId(`objectResult-${i}`),
      dotEl = byId(`objectDot-${i}`);
    if (!resultEl) return;
    if (!item.valid) {
      resultEl.className = "ores";
      resultEl.textContent = t("objectInvalid");
      if (dotEl) dotEl.className = "dot";
      return;
    }
    resultEl.className = "ores " + item.status;
    if (dotEl) dotEl.className = "dot " + item.status;
    resultEl.innerHTML = `<b>${capitalize(STR.status[item.status])}</b><span>${t("objectAtModel", `<span class="mono">${modelPxText(item)}</span>`, formatNumber(item.requiredPx, 0))}</span><span class="m2">${t("objectAtSensor", sensorPxText(item), escapeHtml(feedText(item.feed)))}</span>`;
  });
}
export function syncFormUI(type: TypeDraft, result: TypeOutcome | undefined) {
  const inputs = type.inputs,
    camera = cameraById(inputs.camera);
  byId("focalLengthBox").hidden = inputs.lensMode !== "focal";
  byId("hfovBox").hidden = inputs.lensMode !== "angle";
  byId("zoneStartBox").hidden = inputs.placement === "top";
  const sensor = SENSORS[+inputs.sensor] ?? DEFAULT_SENSOR,
    sensorWidth = result && "frame" in result ? result.frame.sensorWidth : NaN;
  byId<Field>("resolution").disabled = !!camera;
  byId<Field>("sensor").disabled = !!camera;
  byId("pixelPitchBox").hidden = !!camera || sensor.kind !== "pixelPitch";
  const sensorWidthInput = byId<HTMLInputElement>("sensorWidth");
  sensorWidthInput.readOnly = !!camera || sensor.kind !== "custom";
  // ширину матрицы из камеры или по формату показываем в поле, своя остаётся как введена
  if (isFinite(sensorWidth) && (camera || sensor.kind !== "custom"))
    sensorWidthInput.value = String(+sensorWidth.toFixed(2));
  byId("summaryGeometry").textContent =
    `${t(inputs.placement === "top" ? "summaryTop" : "summarySide")}, ${withUnit(formatNumber(parseNum(inputs.cameraHeight), 1), "m")}, ${formatNumber(parseNum(inputs.zoneWidth), 1)} × ${withUnit(formatNumber(parseNum(inputs.zoneDepth), 1), "m")}`;
  byId("summaryCamera").textContent =
    (camera
      ? `${camera.Nw} × ${camera.Nh}`
      : t(
          "megapixels",
          (RESOLUTIONS[+inputs.resolution] ?? DEFAULT_RESOLUTION).megapixels,
        )) +
    (result?.ok ? `, f ${withUnit(formatNumber(result.lens.f, 1), "mm")}` : "");
  byId("summaryStream").textContent =
    `${withUnit(formatNumber(parseNum(inputs.fps), 0), "fps")}, ${inputs.codec === "0.04" ? "H.265" : "H.264"}`;
}

// ---------- добавление объектов
OBJECT_PRESETS.forEach((preset) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = displayName(preset);
  chip.addEventListener("click", () => {
    addObject(preset);
    renderObjects();
  });
  byId("presets").append(chip);
});
byId("addObject").addEventListener("click", () => {
  addObject(NEW_OBJECT);
  renderObjects();
  const lastIndex = activeType().objects.length - 1;
  byId<HTMLInputElement>(`objectName-${lastIndex}`).focus();
  byId<HTMLInputElement>(`objectName-${lastIndex}`).select();
});
