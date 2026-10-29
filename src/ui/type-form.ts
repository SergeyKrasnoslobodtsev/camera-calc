import { displayName, formatNumber, t } from "../i18n/index.ts";
import { resolutionLabel } from "../i18n/domain-text.ts";
import { RESOLUTIONS } from "../domain/references/resolutions.ts";
import { SENSORS } from "../domain/references/sensors.ts";
import { DEFAULT_INPUTS } from "../app/examples.ts";
import {
  activeResult,
  activeType,
  deleteActiveType,
  duplicateActiveType,
  state,
  updateActiveType,
  type TypeDraft,
} from "../app/store.ts";
import { byId, type Field } from "./dom.ts";
import { renderObjects, syncFormUI } from "./object-cards.ts";
import { toast } from "./toast.ts";
// поля формы с теми же id, что и поля TypeDraft.inputs; lensMode и placement — переключатели
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
] as const satisfies readonly (keyof TypeDraft["inputs"])[];
const checkedValue = (name: string) =>
  document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)
    ?.value;
// ---------- форма ↔ тип
RESOLUTIONS.forEach((resolution, i) =>
  byId<HTMLSelectElement>("resolution").add(
    new Option(resolutionLabel(resolution), String(i)),
  ),
);
SENSORS.forEach((sensor, i) =>
  byId<HTMLSelectElement>("sensor").add(
    new Option(
      sensor.kind === "format"
        ? t("sensorFormat", sensor.format, formatNumber(sensor.widthMm, 1))
        : sensor.kind === "pixelPitch"
          ? t("sensorByPixelPitch")
          : t("sensorCustom"),
      String(i),
    ),
  ),
);
export function writeForm(type: TypeDraft) {
  byId<HTMLInputElement>("typeName").value = displayName(type);
  byId<HTMLInputElement>("typeCount").value = String(type.count);
  INPUT_IDS.forEach((id) => {
    byId<Field>(id).value = type.inputs[id] ?? DEFAULT_INPUTS[id];
  });
  const lensModeRadio =
    document.querySelector<HTMLInputElement>(
      `input[name="lensMode"][value="${type.inputs.lensMode}"]`,
    ) || byId<HTMLInputElement>("lensModeAuto");
  lensModeRadio.checked = true;
  const placementRadio =
    document.querySelector<HTMLInputElement>(
      `input[name="placement"][value="${type.inputs.placement}"]`,
    ) || byId<HTMLInputElement>("placementSide");
  placementRadio.checked = true;
  renderObjects();
  syncFormUI(type, activeResult());
}
// название передаётся, только если пользователь его изменил: иначе встроенное осталось бы на одном языке
export function readForm() {
  const name = byId<HTMLInputElement>("typeName").value;
  updateActiveType({
    ...(name !== displayName(activeType()) && { name }),
    count: byId<HTMLInputElement>("typeCount").value,
    inputs: {
      ...(Object.fromEntries(
        INPUT_IDS.map((id) => [id, byId<Field>(id).value]),
      ) as Record<(typeof INPUT_IDS)[number], string>),
      lensMode: checkedValue("lensMode") || "auto",
      placement: checkedValue("placement") || "side",
    },
  });
}

// ---------- события формы и кнопок типа
byId("typeForm").addEventListener("input", readForm);
byId("typeForm").addEventListener("change", readForm);
byId("typeForm").addEventListener("submit", (event) => event.preventDefault());
byId("duplicateTypeBtn").addEventListener("click", () => {
  readForm();
  duplicateActiveType(displayName(activeType()) + t("copySuffix"));
  writeForm(activeType());
  toast(t("typeCopied"));
});
// удаление — по второму нажатию в течение 3 с
let deleteTimer: ReturnType<typeof setTimeout> | null = null;
byId("deleteTypeBtn").addEventListener("click", () => {
  const button = byId("deleteTypeBtn");
  if (state.cameraTypes.length < 2) {
    toast(t("lastType"));
    return;
  }
  if (!deleteTimer) {
    button.textContent = t("deleteTypeConfirm");
    deleteTimer = setTimeout(() => {
      button.textContent = t("deleteTypeBtn");
      deleteTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(deleteTimer);
  deleteTimer = null;
  button.textContent = t("deleteTypeBtn");
  deleteActiveType();
  writeForm(activeType());
  toast(t("typeDeleted"));
});
