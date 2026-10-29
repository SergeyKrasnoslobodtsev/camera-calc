// Экран расчёта: вкладки типов, итоги системы и нагрузка GPU, результат типа, форма типа и объекты, сеть и допущения.
import { LANG, t } from "../../i18n/index.ts";
import formulasEn from "../../formulas.en.html?raw";
import formulasRu from "../../formulas.html?raw";
import { Assumptions } from "./system/Assumptions.tsx";
import { GpuLoad } from "./system/GpuLoad.tsx";
import { NetworkPanel } from "./system/NetworkPanel.tsx";
import { SystemPanel } from "./system/SystemPanel.tsx";
import { ObjectList } from "./type-form/ObjectList.tsx";
import { TypeForm } from "./type-form/TypeForm.tsx";
import { TypeResult } from "./type-result/TypeResult.tsx";
import { TypeTabs } from "./TypeTabs.tsx";

// формулы — статичный текст из src/formulas*.html, без данных пользователя
const FORMULAS = LANG === "en" ? formulasEn : formulasRu;

export function CalculationPage({ hidden }: { hidden: boolean }) {
  return (
    <div
      id="viewMain"
      hidden={hidden}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <nav className="tabs" role="tablist" aria-label={t("tabsAria")} id="tabs">
        <TypeTabs />
      </nav>
      <div className="first">
        <section
          className="syswrap"
          aria-labelledby="systemTitle"
          id="systemPanel"
        >
          <SystemPanel />
        </section>
        <section
          className="panel dash"
          aria-labelledby="loadTitle"
          id="gpuLoad"
        >
          <GpuLoad />
        </section>
        <section
          className="panel res"
          aria-labelledby="resultTitle"
          role="tabpanel"
          id="typeResult"
        >
          <TypeResult />
        </section>
      </div>
      <div className="work">
        <TypeForm />
        <ObjectList />
      </div>
      <div className="bottom">
        <section
          className="panel net"
          aria-labelledby="networkTitle"
          id="networkPanel"
        >
          <NetworkPanel />
        </section>
        <section className="panel assum" aria-labelledby="assumptionsTitle">
          <h2 id="assumptionsTitle">{t("assumptionsTitle")}</h2>
          <ul id="assumptionsList">
            <Assumptions />
          </ul>
          <details className="how" style={{ marginTop: "auto" }}>
            <summary>{t("formulas")}</summary>
            <div className="formulas" id="formulas">
              <div lang={LANG} dangerouslySetInnerHTML={{ __html: FORMULAS }} />
            </div>
          </details>
        </section>
      </div>
    </div>
  );
}
