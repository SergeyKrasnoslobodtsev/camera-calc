// Экран шаблонов «Камеры»: встроенные и свои камеры, форма своей камеры.
import { STR, displayName, formatNumber, t, withUnit } from "../i18n/index.ts";
import { parseCamera } from "../domain/entities/camera.ts";
import { parseNum } from "../domain/parse-num.ts";
import { uid } from "../app/examples.ts";
import {
  activeType,
  addCamera,
  allCameras,
  deleteCamera,
  state,
} from "../app/store.ts";
import { byId, escapeHtml } from "./dom.ts";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { buildCameraSelect } from "./object-cards.ts";
import { toast } from "./toast.ts";
import { writeForm } from "./type-form.ts";

export function renderCamView() {
  const used = (id: string) =>
    state.cameraTypes
      .filter((type) => type.inputs.camera === id)
      .reduce((sum, type) => sum + (Math.round(parseNum(type.count)) || 0), 0);
  byId("camerasTitle").textContent = t("camerasTitle", allCameras().length);
  byId("cameraTable").innerHTML =
    `<tr>${STR.cameraTableHeader.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    allCameras()
      .map(
        (camera) =>
          `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(displayName(camera))}</b><span class="sub">${t(camera.custom ? "cameraCustom" : "cameraBuiltin")}</span></td><td>${camera.Nw} × ${camera.Nh}</td><td>${withUnit(formatNumber(camera.sensorWidth, 2), "mm")}</td><td>${camera.focalMin > 0 ? (camera.focalMin === camera.focalMax ? withUnit(formatNumber(camera.focalMin, 1), "mm") : withUnit(formatNumber(camera.focalMin, 1) + "–" + formatNumber(camera.focalMax, 1), "mm")) : t("cameraAnyLens")}</td><td>${camera.price ? "$" + formatNumber(camera.price, 0) : "—"}</td><td>${used(camera.id)}</td><td>${camera.custom ? `<button type="button" class="sm" data-delc="${camera.id}" aria-label="${escapeHtml(t("deleteAria", displayName(camera)))}">${t("deleteBtn")}</button>` : ""}</td></tr>`,
      )
      .join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-delc]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        deleteCamera(button.dataset.delc!);
        buildCameraSelect();
        writeForm(activeType());
        renderCamView();
        toast(t("cameraDeleted"));
      }),
    );
}
const CAMERA_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  Nw: "errorFrame",
  Nh: "errorFrame",
  sensorWidth: "errorSensorWidth",
  focalMin: "errorFocal",
  focalMax: "errorFocalRange",
  price: "errorCameraPrice",
};
const CAMERA_FORM_IDS = [
  "cameraFormName",
  "cameraFormWidth",
  "cameraFormHeight",
  "cameraFormSensorWidth",
  "cameraFormPixelPitch",
  "cameraFormFocalMin",
  "cameraFormFocalMax",
  "cameraFormPrice",
];
const formNumber = (id: string) => parseNum(byId<HTMLInputElement>(id).value);
byId("cameraForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId<HTMLInputElement>("cameraFormName").value.trim(),
    Nw = formNumber("cameraFormWidth"),
    Nh = formNumber("cameraFormHeight"),
    pixelPitchUm = formNumber("cameraFormPixelPitch");
  let sensorWidth = formNumber("cameraFormSensorWidth");
  let focalMin = formNumber("cameraFormFocalMin"),
    focalMax = formNumber("cameraFormFocalMax");
  const price = formNumber("cameraFormPrice");
  if (isNaN(sensorWidth) && pixelPitchUm > 0 && Nw > 0)
    sensorWidth = +((pixelPitchUm * Nw) / 1000).toFixed(3);
  if (focalMin > 0 && isNaN(focalMax)) focalMax = focalMin;
  if (focalMax > 0 && isNaN(focalMin)) focalMin = focalMax;
  const parsed = parseCamera({
    id: "m" + uid(),
    name,
    Nw,
    Nh,
    sensorWidth,
    focalMin: isNaN(focalMin) ? 0 : focalMin,
    focalMax: isNaN(focalMax) ? 0 : focalMax,
    price: isNaN(price) ? 0 : price,
    custom: true,
  });
  const errorEl = byId("cameraFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "cameraFormError",
      formErrorText(parsed.errors, CAMERA_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addCamera(parsed.value);
  CAMERA_FORM_IDS.forEach((id) => (byId<HTMLInputElement>(id).value = ""));
  buildCameraSelect();
  renderCamView();
  toast(t("cameraAdded", name));
});
