// Список типов камер: строки со статусом, числом камер и долей в инференсе, фильтры, добавление типа.
import { useState } from "react";
import { STR, displayName, t } from "../../../i18n/index.ts";
import { NEW_OBJECT } from "../../../app/examples.ts";
import { addType, selectType, state } from "../../../app/store.ts";
import { typeLoads } from "../../../domain/compute-system/index.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { percent, typeStatus } from "../../lib/labels.ts";

const newType = () => {
  addType(t("newType", state.cameraTypes.length + 1), [NEW_OBJECT]);
  location.hash = "type";
};

export const AddTypeButton = () => (
  <button type="button" className="ghost" onClick={newType}>
    {t("addType")}
  </button>
);

type Filter = "all" | "bad" | "warn";

// строки типов; выбор открывает экран типа. onPick — для списка в шторке
export function TypeRows({
  filter = "all",
  onPick,
}: {
  filter?: Filter;
  onPick?: () => void;
}) {
  const { results, system } = useComputed();
  const loads = system ? typeLoads(system.chosen) : [];
  return results
    .filter((result) => filter === "all" || typeStatus(result) === filter)
    .map((result) => {
      const load = loads.find((item) => item.type.id === result.type.id);
      const status = typeStatus(result);
      return (
        <a
          key={result.type.id}
          className="row"
          href="#type"
          aria-current={
            result.type.id === state.activeTypeId ? "true" : undefined
          }
          onClick={() => {
            selectType(result.type.id);
            onPick?.();
          }}
        >
          <span className={`dot ${status}`} aria-hidden="true" />
          <span>
            <b>{displayName(result.type) || t("untitled")}</b>
            <small>
              × {result.count} ·{" "}
              {result.ok ? STR.typeStatus[status] : t("tabError")}
            </small>
          </span>
          <span className="pc">{load ? percent(load.share) : "—"}</span>
        </a>
      );
    });
}

// боковая колонка: своя прокрутка у строк, фильтры и добавление всегда в окне
export function TypeSide({ systemCurrent }: { systemCurrent: boolean }) {
  const { results } = useComputed();
  const [filter, setFilter] = useState<Filter>("all");
  const count = (status: Filter) =>
    results.filter((result) => typeStatus(result) === status).length;
  const chips: [Filter, string][] = [
    ["all", `${t("filterAll")} ${results.length}`],
    ["bad", `${t("filterBad")} ${count("bad")}`],
    ["warn", `${t("filterWarn")} ${count("warn")}`],
  ];
  return (
    <nav className="side" aria-label={t("tabsAria")}>
      <a
        className="item"
        href="#system"
        aria-current={systemCurrent ? "page" : undefined}
      >
        <span>
          <b>{t("systemTitle")}</b>
          <small>{t("systemHint")}</small>
        </span>
        <span aria-hidden="true">›</span>
      </a>
      <div className="chips" role="group" aria-label={t("filterAria")}>
        {chips.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rows scroll" id="typeList">
        <TypeRows filter={filter} />
      </div>
      <AddTypeButton />
    </nav>
  );
}
