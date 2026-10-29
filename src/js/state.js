import { displayName, formatNumber, t } from "../i18n/index.ts";
import { resolutionLabel } from "../i18n/domain-text.ts";
import { RESOLUTIONS } from "../domain/references/resolutions.ts";
import { SENSORS } from "../domain/references/sensors.ts";
import { DEFAULT_INPUTS } from "../app/examples.ts";
import { activeResult, activeType, updateActiveType } from "../app/store.ts";
import { byId } from "./data.js";
import { renderObjects, syncFormUI } from "./objects.js";
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
// ---------- форма ↔ тип
RESOLUTIONS.forEach((resolution, i) =>
  byId("resolution").add(new Option(resolutionLabel(resolution), i)),
);
SENSORS.forEach((sensor, i) =>
  byId("sensor").add(
    new Option(
      sensor.kind === "format"
        ? t("sensorFormat", sensor.format, formatNumber(sensor.widthMm, 1))
        : sensor.kind === "pixelPitch"
          ? t("sensorByPixelPitch")
          : t("sensorCustom"),
      i,
    ),
  ),
);
export function writeForm(type) {
  byId("typeName").value = displayName(type);
  byId("typeCount").value = type.count;
  INPUT_IDS.forEach((id) => {
    byId(id).value = type.inputs[id] ?? DEFAULT_INPUTS[id];
  });
  const lensModeRadio =
    document.querySelector(
      `input[name="lensMode"][value="${type.inputs.lensMode}"]`,
    ) || byId("lensModeAuto");
  lensModeRadio.checked = true;
  const placementRadio =
    document.querySelector(
      `input[name="placement"][value="${type.inputs.placement}"]`,
    ) || byId("placementSide");
  placementRadio.checked = true;
  renderObjects();
  syncFormUI(type, activeResult());
}
// название передаётся, только если пользователь его изменил: иначе встроенное осталось бы на одном языке
export function readForm() {
  const name = byId("typeName").value;
  updateActiveType({
    ...(name !== displayName(activeType()) && { name }),
    count: byId("typeCount").value,
    inputs: {
      ...Object.fromEntries(INPUT_IDS.map((id) => [id, byId(id).value])),
      lensMode:
        (document.querySelector('input[name="lensMode"]:checked') || {})
          .value || "auto",
      placement:
        (document.querySelector('input[name="placement"]:checked') || {})
          .value || "side",
    },
  });
}
