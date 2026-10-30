// Экран расчёта: итоги системы, вкладки типов, ввод типа рядом с его результатом, параметры системы рядом с нагрузкой и сетью.
import { resetToExample } from "../../app/store.ts";
import { t } from "../../i18n/index.ts";
import { toast } from "../components/Toast.tsx";
import { useConfirm } from "../hooks/useConfirm.ts";
import { Assumptions } from "./system/Assumptions.tsx";
import { GpuLoad } from "./system/GpuLoad.tsx";
import { NetworkPanel } from "./system/NetworkPanel.tsx";
import { SystemForm } from "./system/SystemForm.tsx";
import { SystemPanel } from "./system/SystemPanel.tsx";
import { ObjectList } from "./type-form/ObjectList.tsx";
import { TypeForm } from "./type-form/TypeForm.tsx";
import { TypeResult } from "./type-result/TypeResult.tsx";
import { TypeTabs } from "./TypeTabs.tsx";

export function CalculationPage({ hidden }: { hidden: boolean }) {
  // пример заменяет текущий расчёт, поэтому — по второму нажатию
  const loadExample = useConfirm(() => {
    resetToExample();
    toast(t("exampleLoaded"));
  });
  return (
    <div
      id="viewMain"
      hidden={hidden}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <section
        className="syswrap"
        aria-labelledby="systemTitle"
        id="systemPanel"
      >
        <SystemPanel />
      </section>
      <nav className="tabs" role="tablist" aria-label={t("tabsAria")} id="tabs">
        <TypeTabs />
      </nav>
      <div className="split">
        <div className="inputs">
          <TypeForm />
          <ObjectList />
        </div>
        <section
          className="panel res"
          aria-labelledby="resultTitle"
          role="tabpanel"
          id="typeResult"
        >
          <TypeResult />
        </section>
      </div>
      <div className="split">
        <div className="inputs">
          <SystemForm />
          <section className="panel assum" aria-labelledby="assumptionsTitle">
            <h2 id="assumptionsTitle">{t("assumptionsTitle")}</h2>
            <ul id="assumptionsList">
              <Assumptions />
            </ul>
            <a className="inlink" href="#formulas">
              {t("formulas")}
            </a>
          </section>
        </div>
        <div className="outputs">
          <section
            className="panel dash"
            aria-labelledby="loadTitle"
            id="gpuLoad"
          >
            <GpuLoad />
          </section>
          <section
            className="panel net"
            aria-labelledby="networkTitle"
            id="networkPanel"
          >
            <NetworkPanel />
          </section>
        </div>
      </div>
      <footer className="pagefoot">
        <button
          type="button"
          className="sm"
          id="resetBtn"
          onClick={loadExample.click}
        >
          {t(loadExample.confirming ? "resetConfirm" : "resetBtn")}
        </button>
      </footer>
    </div>
  );
}
