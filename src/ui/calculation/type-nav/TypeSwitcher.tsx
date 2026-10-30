// Смена типа камер: кнопка с активным типом и шторка со списком типов.
import { useState } from "react";
import { displayName, t } from "../../../i18n/index.ts";
import { activeType, state } from "../../../app/store.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { typeStatus } from "../../lib/labels.ts";
import { AddTypeButton, TypeRows } from "./TypeList.tsx";

export function TypeSwitcher() {
  const { results } = useComputed();
  const [open, setOpen] = useState(false);
  const type = activeType();
  const index = state.cameraTypes.indexOf(type);
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        className="switcher"
        aria-label={t("switchTypeAria")}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span
          className={`dot ${typeStatus(results[index])}`}
          aria-hidden="true"
        />
        <b>{displayName(type) || t("untitled")}</b>
        <span className="mono">
          {index + 1}/{results.length}
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("tabsAria")}
          onKeyDown={(event) => event.key === "Escape" && close()}
        >
          <button
            type="button"
            className="scrim"
            aria-label={t("closeTypesAria")}
            autoFocus
            onClick={close}
          />
          <div className="typesheet">
            <div className="typesheethead">
              <h2>{t("typeListTitle", results.length)}</h2>
              <AddTypeButton />
            </div>
            <div className="rows">
              <TypeRows
                onPick={() => {
                  close();
                  window.scrollTo(0, 0);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
