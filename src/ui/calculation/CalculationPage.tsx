// Экран расчёта: сводка системы, список типов, экран типа (ввод и результат) или экран «Система» (параметры и нагрузка).
import { resetToExample } from "../../app/store.ts";
import { t } from "../../i18n/index.ts";
import { toast } from "../components/Toast.tsx";
import { useConfirm } from "../hooks/useConfirm.ts";
import { Assumptions } from "./system/Assumptions.tsx";
import { GpuLoad } from "./system/GpuLoad.tsx";
import { NetworkPanel } from "./system/NetworkPanel.tsx";
import { SystemForm } from "./system/SystemForm.tsx";
import { SystemSummary } from "./system/SystemSummary.tsx";
import { ObjectList } from "./type-form/ObjectList.tsx";
import { TypeForm } from "./type-form/TypeForm.tsx";
import { ResultPanel } from "./type-result/ResultPanel.tsx";
import { ScreenBar } from "./type-nav/ScreenBar.tsx";
import { AddTypeButton, TypeSide } from "./type-nav/TypeList.tsx";
import { TypeSwitcher } from "./type-nav/TypeSwitcher.tsx";

export function CalculationPage({
  hidden,
  route,
}: {
  hidden: boolean;
  route: string;
}) {
  // пример заменяет текущий расчёт, поэтому — по второму нажатию
  const loadExample = useConfirm(() => {
    resetToExample();
    toast(t("exampleLoaded"));
  });
  // на широком экране обзор совпадает с экраном типа, на телефоне это отдельные экраны
  const screen =
    route === "system" ? "system" : route === "type" ? "type" : "home";
  const system = screen === "system";
  return (
    <div id="viewMain" hidden={hidden} data-screen={screen}>
      {screen !== "home" && <ScreenBar screen={screen} />}
      <SystemSummary current={system} />
      <div className="typebar">
        <TypeSwitcher />
        <a
          className="btn"
          href="#system"
          aria-current={system ? "page" : undefined}
        >
          {t("systemTitle")}
        </a>
        <AddTypeButton />
      </div>
      <div className="tri">
        <TypeSide systemCurrent={system} />
        <div className="split" hidden={system}>
          <div className="inputs">
            <TypeForm />
            <ObjectList />
          </div>
          <ResultPanel route={route} />
        </div>
        <div className="split" hidden={!system}>
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
