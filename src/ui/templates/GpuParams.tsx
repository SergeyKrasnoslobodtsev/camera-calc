// Параметры подбора под каталогом видеокарт: КПД и резерв.
import { state, updateSystem } from "../../app/store.ts";
import { t } from "../../i18n/index.ts";
import { Tip } from "../components/Tip.tsx";
import { useComputed } from "../hooks/useComputed.ts";

export function GpuParams() {
  // значения полей — из state; хук перерисовывает их после каждого действия
  useComputed();
  return (
    <>
      <div className="f">
        <div className="lrow">
          <label htmlFor="efficiency">{t("efficiency")}</label>
          <Tip field="efficiency" />
        </div>
        <input
          id="efficiency"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={state.system.efficiency}
          onChange={(event) => updateSystem("efficiency", event.target.value)}
        />
      </div>
      <div className="f">
        <div className="lrow">
          <label htmlFor="reserve">{t("reserve")}</label>
          <Tip field="reserve" />
        </div>
        <input
          id="reserve"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={state.system.reserve}
          onChange={(event) => updateSystem("reserve", event.target.value)}
        />
      </div>
    </>
  );
}
