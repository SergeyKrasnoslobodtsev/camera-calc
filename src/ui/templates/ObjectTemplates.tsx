// Экран шаблонов «Объекты детекции»: свои и встроенные объекты, сколько объектов расчёта их ищут, форма своего объекта.
import { STR, displayName, formatNumber, t } from "../../i18n/index.ts";
import type { DetectionObject } from "../../domain/entities/detection-object.ts";
import { BUILTIN_DETECTION_OBJECTS } from "../../domain/references/detection-objects.ts";
import { deleteDetectionObject, state } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { CatalogSection } from "./CatalogSection.tsx";
import { ObjectForm } from "./ObjectForm.tsx";

const objectsUsing = (targetId: string) =>
  state.cameraTypes.reduce(
    (sum, type) =>
      sum + type.objects.filter((object) => object.target === targetId).length,
    0,
  );

// габарит, см: целое без дробной части
const sizeCm = (value: number) =>
  formatNumber(value, Number.isInteger(value) ? 0 : 1);

export function ObjectTemplates({ hidden }: { hidden: boolean }) {
  // свои объекты детекции и объекты расчёта, где они выбраны, — из state
  useComputed();
  const { customObjects } = state;
  const headers = STR.objectTableHeader;
  return (
    <div className="gpage" id="templatePage-objects" hidden={hidden}>
      <CatalogSection
        titleId="detectionObjectsTitle"
        title={t(
          "detectionObjectsTitle",
          BUILTIN_DETECTION_OBJECTS.length + customObjects.length,
        )}
        note={t("detectionObjectsNote")}
      >
        <div className="tbl" style={{ padding: "4px 8px 12px" }}>
          <table id="objectTable">
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customObjects.length > 0 ? (
                customObjects.map((detectionObject) => (
                  <ObjectRow
                    key={detectionObject.id}
                    detectionObject={detectionObject}
                  />
                ))
              ) : (
                <tr>
                  <td className="txt dim" colSpan={headers.length + 1}>
                    {t("detectionObjectsEmpty")}
                  </td>
                </tr>
              )}
              {BUILTIN_DETECTION_OBJECTS.map((detectionObject) => (
                <ObjectRow
                  key={detectionObject.id}
                  detectionObject={detectionObject}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CatalogSection>
      <ObjectForm />
    </div>
  );
}

function ObjectRow({ detectionObject }: { detectionObject: DetectionObject }) {
  const { id, width, length, height, requiredPx, custom } = detectionObject;
  const name = displayName(detectionObject);
  const remove = () => {
    deleteDetectionObject(id);
    toast(t("detectionObjectDeleted"));
  };
  return (
    <tr>
      <td className="txt">
        {custom ? <b style={{ fontWeight: 600 }}>{name}</b> : name}
        <span className="sub">
          {t(custom ? "detectionObjectCustom" : "detectionObjectBuiltin")}
        </span>
      </td>
      <td>{[width, length, height].map(sizeCm).join(" × ")}</td>
      <td>{requiredPx}</td>
      <td>{objectsUsing(id)}</td>
      <td>
        {custom && (
          <button
            type="button"
            className="sm"
            aria-label={t("deleteAria", name)}
            onClick={remove}
          >
            {t("deleteBtn")}
          </button>
        )}
      </td>
    </tr>
  );
}
