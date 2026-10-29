// Экран шаблонов «Видеокарты»: каталог и свои карты с ценой и участием в подборе, параметры подбора, форма своей карты.
import { STR, formatNumber, t, withUnit } from "../../i18n/index.ts";
import type { Gpu } from "../../domain/entities/gpu.ts";
import { GPU_CATALOG } from "../../domain/references/gpu-catalog.ts";
import {
  deleteGpu,
  isOn,
  setGpuEnabled,
  setGpuPrice,
  state,
} from "../../app/store.ts";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { CatalogSection } from "./CatalogSection.tsx";
import { GpuForm } from "./GpuForm.tsx";
import { GpuParams } from "./GpuParams.tsx";

export function GpuTemplates({ hidden }: { hidden: boolean }) {
  // цены, участие в подборе и свои карты — из state
  useComputed();
  const customCount = state.customGpus.length;
  return (
    <div className="gpage" id="templatePage-gpus" hidden={hidden}>
      <CatalogSection
        titleId="catalogTitle"
        title={t("catalogTitle", GPU_CATALOG.length)}
        note={t("catalogNote")}
      >
        <div className="tbl" style={{ padding: "4px 8px 8px" }}>
          <GpuTable id="catalogTable" gpus={GPU_CATALOG} />
        </div>
        <div className="mine" id="customGpus">
          {customCount > 0 ? (
            <>
              <strong style={{ fontWeight: 600 }}>
                {t("customGpusTitle", customCount)}
              </strong>
              <div className="tbl">
                <GpuTable gpus={state.customGpus} />
              </div>
            </>
          ) : (
            <>
              <strong style={{ fontWeight: 600 }}>
                {t("customGpusTitleNoCount")}
              </strong>
              <span className="note" style={{ fontSize: 13 }}>
                {t("customGpusEmpty")}
              </span>
            </>
          )}
        </div>
        <div className="params" id="gpuParams">
          <GpuParams />
        </div>
      </CatalogSection>
      <GpuForm />
    </div>
  );
}

function GpuTable({ id, gpus }: { id?: string; gpus: readonly Gpu[] }) {
  const headers = STR.gpuTableHeader;
  return (
    <table id={id}>
      <thead>
        <tr>
          {headers.slice(0, 6).map((header) => (
            <th key={header}>{header}</th>
          ))}
          <th style={{ textAlign: "center" }}>{headers[6]}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {gpus.map((gpu) => (
          <GpuRow key={gpu.id} gpu={gpu} />
        ))}
      </tbody>
    </table>
  );
}

// декодер: число NVDEC, у Jetson — замер потоков H.265
const decoderText = (gpu: Gpu) =>
  gpu.decodeStreams
    ? t("decoderStreams", formatNumber(gpu.decodeStreams.h265, 0))
    : `${gpu.nvdec} NVDEC`;

function GpuRow({ gpu }: { gpu: Gpu }) {
  const remove = () => {
    deleteGpu(gpu.id);
    toast(t("gpuDeleted"));
  };
  return (
    <tr>
      <td className="txt">
        <b style={{ fontWeight: 600 }}>{gpu.name}</b>
        <span className="sub">
          {gpu.jetson ? t("gpuJetson") : gpu.arch}
          {gpu.custom ? " · " + t("gpuCustom") : ""}
        </span>
      </td>
      <td>{formatNumber(gpu.tflops, 1)}</td>
      <td>{decoderText(gpu)}</td>
      <td>{withUnit(formatNumber(gpu.memoryGB, 0), "gb")}</td>
      <td>{gpu.tdpW ? withUnit(formatNumber(gpu.tdpW, 0), "w") : "—"}</td>
      <td>
        <NumberInput
          integer
          id={`gpuPrice-${gpu.id}`}
          value={state.gpuPrices[gpu.id] ?? gpu.price}
          aria-label={t("gpuPriceAria", gpu.name)}
          onChange={(event) => setGpuPrice(gpu.id, event.target.value)}
        />
      </td>
      <td style={{ textAlign: "center" }}>
        <input
          type="checkbox"
          id={`gpuEnabled-${gpu.id}`}
          checked={isOn(gpu)}
          aria-label={t("gpuEnabledAria", gpu.name)}
          onChange={(event) => setGpuEnabled(gpu.id, event.target.checked)}
        />
      </td>
      <td>
        {gpu.custom && (
          <button
            type="button"
            className="sm"
            aria-label={t("deleteAria", gpu.name)}
            onClick={remove}
          >
            {t("deleteBtn")}
          </button>
        )}
      </td>
    </tr>
  );
}
