// Экран шаблонов «Детекторы»: свои детекторы и модели каталога, сколько объектов их используют, форма своего детектора.
import { STR, formatNumber, t } from "../../i18n/index.ts";
import type { CustomDetector } from "../../domain/entities/detector.ts";
import { MODELS } from "../../domain/references/models.ts";
import { deleteDetector, gpuById, state } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { CatalogSection } from "./CatalogSection.tsx";
import { DetectorForm } from "./DetectorForm.tsx";

// модели каталога замерены на T4 со входом 640
const CATALOG_INPUT = 640;
const CATALOG_GPU = "T4";

const objectsUsing = (modelId: string) =>
  state.cameraTypes.reduce(
    (sum, type) =>
      sum + type.objects.filter((object) => object.model === modelId).length,
    0,
  );

export function DetectorTemplates({ hidden }: { hidden: boolean }) {
  // свои детекторы и объекты, где они выбраны, — из state
  useComputed();
  const { customDetectors } = state;
  const headers = STR.detectorTableHeader;
  return (
    <div className="gpage" id="templatePage-dets" hidden={hidden}>
      <CatalogSection
        titleId="detectorsTitle"
        title={t("detectorsTitle", MODELS.length + customDetectors.length)}
        note={t("detectorsNote")}
      >
        <div className="tbl" style={{ padding: "4px 8px 12px" }}>
          <table id="detectorTable">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customDetectors.length > 0 ? (
                customDetectors.map((detector) => (
                  <DetectorRow key={detector.id} detector={detector} />
                ))
              ) : (
                <tr>
                  <td className="txt dim" colSpan={headers.length + 1}>
                    {t("detectorsEmpty")}
                  </td>
                </tr>
              )}
              {MODELS.map((model) => (
                <tr key={model.id}>
                  <td className="txt">
                    {model.name}
                    <span className="sub">{t("detectorCatalog")}</span>
                  </td>
                  <td>{CATALOG_INPUT}</td>
                  <td>{formatNumber(model.gflops, 1)}</td>
                  <td>
                    {t(
                      "detectorSpeed",
                      formatNumber(1000 / model.latencyMs, 0),
                      CATALOG_GPU,
                    )}
                  </td>
                  <td>{objectsUsing(model.id)}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CatalogSection>
      <DetectorForm />
    </div>
  );
}

function DetectorRow({ detector }: { detector: CustomDetector }) {
  const remove = () => {
    deleteDetector(detector.id);
    toast(t("detectorDeleted"));
  };
  return (
    <tr>
      <td className="txt">
        <b style={{ fontWeight: 600 }}>{detector.name}</b>
        <span className="sub">{t("detectorCustom")}</span>
      </td>
      <td>{detector.inputSize}</td>
      <td>{detector.gflops > 0 ? formatNumber(detector.gflops, 1) : "—"}</td>
      <td>
        {t(
          "detectorSpeed",
          formatNumber(detector.fps, 0),
          gpuById(detector.refGpu)?.name ?? "?",
        )}
      </td>
      <td>{objectsUsing(detector.id)}</td>
      <td>
        <button
          type="button"
          className="sm"
          aria-label={t("deleteAria", detector.name)}
          onClick={remove}
        >
          {t("deleteBtn")}
        </button>
      </td>
    </tr>
  );
}
