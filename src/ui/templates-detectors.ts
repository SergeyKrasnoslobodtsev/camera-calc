// Экран шаблонов «Детекторы»: модели каталога и свои детекторы, форма своего детектора.
import { STR, formatNumber, t } from "../i18n/index.ts";
import { parseDetector } from "../domain/entities/detector.ts";
import { parseNum } from "../domain/parse-num.ts";
import { MODELS } from "../domain/references/models.ts";
import { uid } from "../app/examples.ts";
import {
  addDetector,
  allGpus,
  deleteDetector,
  gpuById,
  state,
} from "../app/store.ts";
import { byId, escapeHtml } from "./dom.ts";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { MODEL_INPUT_SIZES } from "./lib/model-input-sizes.ts";
import { toast } from "./toast.ts";

// список «GPU замера» в форме детектора: после изменения своих карт выбор сохраняется, если карта осталась
export function buildRefGpuSelect() {
  const refSelect = byId<HTMLSelectElement>("detectorFormRefGpu");
  if (refSelect) {
    const refCurrent = refSelect.value;
    refSelect.innerHTML = allGpus()
      .map(
        (gpu) => `<option value="${gpu.id}">${escapeHtml(gpu.name)}</option>`,
      )
      .join("");
    refSelect.value = gpuById(refCurrent) ? refCurrent : "5090";
  }
}
export function renderDetView() {
  byId("detectorsTitle").textContent = t(
    "detectorsTitle",
    MODELS.length + state.customDetectors.length,
  );
  const used = (id: string) =>
    state.cameraTypes.reduce(
      (sum, type) =>
        sum + type.objects.filter((obj) => obj.model === id).length,
      0,
    );
  byId("detectorTable").innerHTML =
    `<tr>${STR.detectorTableHeader.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    (state.customDetectors.length
      ? state.customDetectors
          .map((detector) => {
            const refGpu = gpuById(detector.refGpu);
            return `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(detector.name)}</b><span class="sub">${t("detectorCustom")}</span></td><td>${detector.inputSize}</td><td>${detector.gflops > 0 ? formatNumber(detector.gflops, 1) : "—"}</td><td>${t("detectorSpeed", formatNumber(detector.fps, 0), escapeHtml(refGpu ? refGpu.name : "?"))}</td><td>${used(detector.id)}</td><td><button type="button" class="sm" data-deld="${detector.id}" aria-label="${escapeHtml(t("deleteAria", detector.name))}">${t("deleteBtn")}</button></td></tr>`;
          })
          .join("")
      : `<tr><td class="txt dim" colspan="6">${t("detectorsEmpty")}</td></tr>`) +
    MODELS.map(
      (model) =>
        `<tr><td class="txt">${model.name}<span class="sub">${t("detectorCatalog")}</span></td><td>640</td><td>${formatNumber(model.gflops, 1)}</td><td>${t("detectorSpeed", formatNumber(1000 / model.latencyMs, 0), "T4")}</td><td>${used(model.id)}</td><td></td></tr>`,
    ).join("");
  document
    .querySelectorAll<HTMLButtonElement>("[data-deld]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        deleteDetector(button.dataset.deld!);
        renderDetView();
        toast(t("detectorDeleted"));
      }),
    );
}
byId("detectorFormInput").innerHTML = MODEL_INPUT_SIZES.map(
  (size) => `<option${size === 640 ? " selected" : ""}>${size}</option>`,
).join("");
const DETECTOR_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  fps: "errorFps",
  gflops: "errorGflops",
};
const DETECTOR_FORM_IDS = [
  "detectorFormName",
  "detectorFormFps",
  "detectorFormGflops",
];
const formValue = (id: string) => byId<HTMLInputElement>(id).value;
byId("detectorForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = formValue("detectorFormName").trim(),
    gflops = parseNum(formValue("detectorFormGflops"));
  const parsed = parseDetector({
    id: "d" + uid(),
    name,
    fps: parseNum(formValue("detectorFormFps")),
    inputSize: +formValue("detectorFormInput"),
    refGpu: formValue("detectorFormRefGpu"),
    gflops: isNaN(gflops) ? 0 : gflops,
    custom: true,
  });
  const errorEl = byId("detectorFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "cameraFormError",
      formErrorText(parsed.errors, DETECTOR_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addDetector(parsed.value);
  DETECTOR_FORM_IDS.forEach((id) => (byId<HTMLInputElement>(id).value = ""));
  renderDetView();
  toast(t("detectorAdded", name));
});
