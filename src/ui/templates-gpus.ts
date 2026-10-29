// Экран шаблонов «Видеокарты»: каталог и свои карты, цены, участие в подборе, форма своей карты.
import { STR, formatNumber, t, withUnit } from "../i18n/index.ts";
import type { Gpu } from "../domain/entities/gpu.ts";
import { parseGpu } from "../domain/entities/gpu.ts";
import { parseNum } from "../domain/parse-num.ts";
import { GPU_CATALOG } from "../domain/references/gpu-catalog.ts";
import { uid } from "../app/examples.ts";
import {
  addGpu,
  allGpus,
  deleteGpu,
  isOn,
  setGpuEnabled,
  setGpuPrice,
  state,
} from "../app/store.ts";
import { byId, escapeHtml } from "./dom.ts";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { buildRefGpuSelect } from "./templates-detectors.ts";
import { toast } from "./toast.ts";

const decText = (gpu: Gpu) =>
  gpu.decodeStreams
    ? t("decoderStreams", formatNumber(gpu.decodeStreams.h265, 0))
    : `${gpu.nvdec} NVDEC`;
export function renderGpuView() {
  const row = (
    gpu: Gpu,
  ) => `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(gpu.name)}</b><span class="sub">${gpu.jetson ? t("gpuJetson") : escapeHtml(gpu.arch)}${gpu.custom ? " · " + t("gpuCustom") : ""}</span></td><td>${formatNumber(gpu.tflops, 1)}</td><td>${decText(gpu)}</td><td>${withUnit(formatNumber(gpu.memoryGB, 0), "gb")}</td><td>${gpu.tdpW ? withUnit(formatNumber(gpu.tdpW, 0), "w") : "—"}</td>
    <td><input id="gpuPrice-${gpu.id}" value="${escapeHtml(state.gpuPrices[gpu.id] ?? gpu.price)}" type="number" min="0" step="1" inputmode="numeric" aria-label="${escapeHtml(t("gpuPriceAria", gpu.name))}"></td>
    <td style="text-align:center"><input type="checkbox" id="gpuEnabled-${gpu.id}" ${isOn(gpu) ? "checked" : ""} aria-label="${escapeHtml(t("gpuEnabledAria", gpu.name))}"></td>
    ${gpu.custom ? `<td><button type="button" class="sm" data-delg="${gpu.id}" aria-label="${escapeHtml(t("deleteAria", gpu.name))}">${t("deleteBtn")}</button></td>` : "<td></td>"}</tr>`;
  const headers = STR.gpuTableHeader,
    head = `<tr>${headers
      .slice(0, 6)
      .map((header) => `<th>${header}</th>`)
      .join("")}<th style="text-align:center">${headers[6]}</th><th></th></tr>`;
  byId("catalogTitle").textContent = t("catalogTitle", GPU_CATALOG.length);
  byId("catalogTable").innerHTML = head + GPU_CATALOG.map(row).join("");
  byId("customGpus").innerHTML = state.customGpus.length
    ? `<strong style="font-weight:600">${t("customGpusTitle", state.customGpus.length)}</strong><div class="tbl"><table>${head}${state.customGpus.map(row).join("")}</table></div>`
    : `<strong style="font-weight:600">${t("customGpusTitleNoCount")}</strong><span class="note" style="font-size:13px">${t("customGpusEmpty")}</span>`;
  allGpus().forEach((gpu) => {
    const price = byId<HTMLInputElement>(`gpuPrice-${gpu.id}`),
      enabled = byId<HTMLInputElement>(`gpuEnabled-${gpu.id}`);
    price.addEventListener("input", () => setGpuPrice(gpu.id, price.value));
    enabled.addEventListener("change", () =>
      setGpuEnabled(gpu.id, enabled.checked),
    );
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-delg]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        deleteGpu(button.dataset.delg!);
        buildRefGpuSelect();
        renderGpuView();
        toast(t("gpuDeleted"));
      }),
    );
}
const architecture = byId<HTMLSelectElement>("gpuFormArchitecture");
architecture.addEventListener("change", () => {
  const isJetson = architecture.value === "jet";
  byId("gpuFormDecodersLabel").textContent = t(
    isJetson ? "gpuFormDecoderStreams" : "gpuFormDecoders",
  );
  byId<HTMLInputElement>("gpuFormDecoders").placeholder = isJetson ? "22" : "2";
});
const GPU_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  tflops: "errorTflops",
  nvdec: "errorDecoders",
  "decodeStreams.h264": "errorDecoderStreams",
  "decodeStreams.h265": "errorDecoderStreams",
  memoryGB: "errorMemory",
  tdpW: "errorTdp",
  price: "errorPrice",
};
const GPU_FORM_IDS = [
  "gpuFormName",
  "gpuFormTflops",
  "gpuFormDecoders",
  "gpuFormMemory",
  "gpuFormTdp",
  "gpuFormPrice",
];
const formValue = (id: string) => byId<HTMLInputElement>(id).value;
byId("gpuForm").addEventListener("submit", (event) => {
  event.preventDefault();
  // decode — число NVDEC, у Jetson — потоков 1080p30 H.265
  const name = formValue("gpuFormName").trim(),
    arch = architecture.value,
    decode = parseNum(formValue("gpuFormDecoders")),
    tdpW = parseNum(formValue("gpuFormTdp"));
  const parsed = parseGpu({
    id: "c" + uid(),
    name,
    arch: arch === "jet" ? "Ampere" : arch,
    tflops: parseNum(formValue("gpuFormTflops")),
    ...(arch === "jet"
      ? {
          jetson: true,
          decodeStreams: {
            h264: +((decode * 748) / 1415).toFixed(1),
            h265: decode,
          },
        }
      : { nvdec: decode }),
    memoryGB: parseNum(formValue("gpuFormMemory")),
    tdpW: isNaN(tdpW) ? 0 : tdpW,
    price: parseNum(formValue("gpuFormPrice")),
    custom: true,
  });
  const errorEl = byId("gpuFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "gpuFormError",
      formErrorText(parsed.errors, GPU_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addGpu(parsed.value, byId<HTMLInputElement>("gpuFormEnabled").checked);
  GPU_FORM_IDS.forEach((id) => (byId<HTMLInputElement>(id).value = ""));
  buildRefGpuSelect();
  renderGpuView();
  toast(t("gpuAdded", name));
});
