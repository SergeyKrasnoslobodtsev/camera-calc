// Экран шаблонов: вкладки видеокарт, камер и моделей, экспорт и импорт всех данных.
import { useRef } from "react";
import { t, type TextKey } from "../../i18n/index.ts";
import { useConfirm } from "../hooks/useConfirm.ts";
import { CameraTemplates } from "./CameraTemplates.tsx";
import { ModelTemplates } from "./ModelTemplates.tsx";
import { downloadState, loadStateFile } from "./file-actions.ts";
import { GpuTemplates } from "./GpuTemplates.tsx";

// адрес вкладки после # и её подпись
const TABS = [
  ["tpl-gpus", "templateTabGpus"],
  ["tpl-cams", "templateTabCameras"],
  ["tpl-models", "templateTabModels"],
] as const satisfies readonly (readonly [string, TextKey])[];
export type TemplateRoute = (typeof TABS)[number][0];
export const isTemplateRoute = (route: string): route is TemplateRoute =>
  TABS.some(([tab]) => tab === route);

// page — открытая вкладка; null — экран скрыт. Вкладки остаются в разметке, чтобы не терять ввод в формах
export function TemplatesPage({ page }: { page: TemplateRoute | null }) {
  const fileInput = useRef<HTMLInputElement>(null);
  // импорт заменяет все данные, поэтому выбор файла — по второму нажатию
  const importData = useConfirm(() => fileInput.current?.click());

  return (
    <div
      id="viewTemplates"
      hidden={page === null}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <div className="tplhead">
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <a href="#" style={{ fontSize: 13, textDecoration: "none" }}>
            {t("back")}
          </a>
          <h2 className="h2big" style={{ fontSize: 22 }}>
            {t("templatesTitle")}
          </h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <nav className="tpltabs" aria-label={t("templatesNav")}>
            {TABS.map(([route, label]) => (
              <a
                key={route}
                href={"#" + route}
                aria-current={route === page ? "page" : undefined}
              >
                {t(label)}
              </a>
            ))}
          </nav>
          <button
            type="button"
            id="exportBtn"
            title={t("exportTitle")}
            onClick={downloadState}
          >
            {t("exportBtn")}
          </button>
          <button
            type="button"
            id="importBtn"
            title={t("importTitle")}
            onClick={importData.click}
          >
            {t(importData.confirming ? "importConfirm" : "importBtn")}
          </button>
          <input
            ref={fileInput}
            type="file"
            id="importFile"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              // тот же файл можно выбрать снова
              event.target.value = "";
              if (file) loadStateFile(file);
            }}
          />
        </div>
      </div>
      <GpuTemplates hidden={page !== "tpl-gpus"} />
      <CameraTemplates hidden={page !== "tpl-cams"} />
      <ModelTemplates hidden={page !== "tpl-models"} />
    </div>
  );
}
