// Вкладки типов камер и кнопка «добавить тип».
import { STR, displayName, t } from "../../i18n/index.ts";
import { OBJECT_PRESETS } from "../../app/examples.ts";
import { activeType, addType, selectType, state } from "../../app/store.ts";
import { writeForm } from "../type-form.ts";
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
            if (state.activeTypeId === result.type.id) return;
            selectType(result.type.id);
            writeForm(activeType());
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
          addType(t("newType", state.cameraTypes.length + 1), [
            OBJECT_PRESETS[0],
          ]);
          writeForm(activeType());
        }}
      >
        {t("addType")}
      </button>
    </>
  );
}
