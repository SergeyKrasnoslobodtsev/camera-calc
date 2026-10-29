// Вкладки типов камер и кнопка «добавить тип».
import { STR, displayName, t } from "../../i18n/index.ts";
import { NEW_OBJECT } from "../../app/examples.ts";
import { addType, selectType, state } from "../../app/store.ts";
import { useComputed } from "../hooks/useComputed.ts";

export function TypeTabs() {
  const { results } = useComputed();
  return (
    <>
      {results.map((result) => (
        <button
          key={result.type.id}
          type="button"
          className="tab"
          role="tab"
          aria-selected={result.type.id === state.activeTypeId}
          aria-controls="typeResult"
          title={
            result.ok
              ? t("tabObjects", STR.status[result.status])
              : t("tabError")
          }
          onClick={() => {
            selectType(result.type.id);
          }}
        >
          <span
            className={`dot ${result.ok ? result.status : "bad"}`}
            aria-hidden="true"
          />
          <b>{displayName(result.type) || t("untitled")}</b>
          <small>× {result.count}</small>
        </button>
      ))}
      <button
        type="button"
        className="tab ghost"
        onClick={() => {
          addType(t("newType", state.cameraTypes.length + 1), [NEW_OBJECT]);
        }}
      >
        {t("addType")}
      </button>
    </>
  );
}
