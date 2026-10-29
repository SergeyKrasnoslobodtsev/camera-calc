// Вкладки типов камер и кнопка «добавить тип».
import { STR, displayName, t } from "../i18n/index.ts";
import { OBJECT_PRESETS } from "../app/examples.ts";
import {
  activeType,
  addType,
  selectType,
  state,
  type TypeOutcome,
} from "../app/store.ts";
import { byId, escapeHtml } from "./dom.ts";
import { writeForm } from "./type-form.ts";

export function renderTabs(results: TypeOutcome[]) {
  const nav = byId("tabs");
  nav.innerHTML = "";
  results.forEach((result) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute(
      "aria-selected",
      String(result.type.id === state.activeTypeId),
    );
    tab.setAttribute("aria-controls", "typeResult");
    tab.innerHTML = `<span class="dot ${result.ok ? result.status : "bad"}" aria-hidden="true"></span><b>${escapeHtml(displayName(result.type) || t("untitled"))}</b><small>× ${result.count}</small>`;
    tab.title = result.ok
      ? t("tabObjects", STR.status[result.status])
      : t("tabError");
    tab.addEventListener("click", () => {
      if (state.activeTypeId === result.type.id) return;
      selectType(result.type.id);
      writeForm(activeType());
    });
    nav.append(tab);
  });
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "tab ghost";
  addButton.textContent = t("addType");
  addButton.addEventListener("click", () => {
    addType(t("newType", state.cameraTypes.length + 1), [OBJECT_PRESETS[0]]);
    writeForm(activeType());
  });
  nav.append(addButton);
}
