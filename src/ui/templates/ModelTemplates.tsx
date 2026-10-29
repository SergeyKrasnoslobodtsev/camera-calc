// Экран шаблонов «Модели»: свои модели и модели каталога, сколько объектов их используют, форма своей модели.
import { STR, formatNumber, t } from "../../i18n/index.ts";
import type { CustomModel } from "../../domain/entities/model.ts";
import { MODELS } from "../../domain/references/models.ts";
import { deleteModel, gpuById, state } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { CatalogSection } from "./CatalogSection.tsx";
import { ModelForm } from "./ModelForm.tsx";

// модели каталога замерены на T4 со входом 640
const CATALOG_INPUT = 640;
const CATALOG_GPU = "T4";

const objectsUsing = (modelId: string) =>
  state.cameraTypes.reduce(
    (sum, type) =>
      sum + type.objects.filter((object) => object.model === modelId).length,
    0,
  );

export function ModelTemplates({ hidden }: { hidden: boolean }) {
  // свои модели и объекты, где они выбраны, — из state
  useComputed();
  const { customModels } = state;
  const headers = STR.modelTableHeader;
  return (
    <div className="gpage" id="templatePage-models" hidden={hidden}>
      <CatalogSection
        titleId="modelsTitle"
        title={t("modelsTitle", MODELS.length + customModels.length)}
        note={t("modelsNote")}
      >
        <div className="tbl" style={{ padding: "4px 8px 12px" }}>
          <table id="modelTable">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customModels.length > 0 ? (
                customModels.map((customModel) => (
                  <ModelRow key={customModel.id} customModel={customModel} />
                ))
              ) : (
                <tr>
                  <td className="txt dim" colSpan={headers.length + 1}>
                    {t("modelsEmpty")}
                  </td>
                </tr>
              )}
              {MODELS.map((model) => (
                <tr key={model.id}>
                  <td className="txt">
                    {model.name}
                    <span className="sub">{t("modelCatalog")}</span>
                  </td>
                  <td>{CATALOG_INPUT}</td>
                  <td>{formatNumber(model.gflops, 1)}</td>
                  <td>
                    {t(
                      "modelSpeed",
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
      <ModelForm />
    </div>
  );
}

function ModelRow({ customModel }: { customModel: CustomModel }) {
  const remove = () => {
    deleteModel(customModel.id);
    toast(t("modelDeleted"));
  };
  return (
    <tr>
      <td className="txt">
        <b style={{ fontWeight: 600 }}>{customModel.name}</b>
        <span className="sub">{t("modelCustom")}</span>
      </td>
      <td>{customModel.inputSize}</td>
      <td>
        {customModel.gflops > 0 ? formatNumber(customModel.gflops, 1) : "—"}
      </td>
      <td>
        {t(
          "modelSpeed",
          formatNumber(customModel.fps, 0),
          gpuById(customModel.refGpu)?.name ?? "?",
        )}
      </td>
      <td>{objectsUsing(customModel.id)}</td>
      <td>
        <button
          type="button"
          className="sm"
          aria-label={t("deleteAria", customModel.name)}
          onClick={remove}
        >
          {t("deleteBtn")}
        </button>
      </td>
    </tr>
  );
}
