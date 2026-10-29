import { LANG, t } from "../i18n/index.ts";
import { loadSaved, save, watchOtherTabs } from "../app/persistence.ts";
import { activeType, restore, state, subscribe } from "../app/store.ts";
import {
  buildGpuSelect,
  renderResults,
  route,
  toast,
  writeSystemForm,
} from "./system-ui.js";
import { buildCameraSelect } from "./objects.js";
import { writeForm } from "./state.js";
import "./popover.js";
// тексты статичной разметки: ключи словаря в атрибутах data-t, data-ta, data-tt, data-tp
function applyTranslations() {
  document.documentElement.lang = LANG;
  document.title = t("docTitle");
  document
    .querySelectorAll("#formulas>[lang]")
    .forEach((block) => (block.hidden = block.lang !== LANG));
  document
    .querySelectorAll("[data-t]")
    .forEach((element) => (element.textContent = t(element.dataset.t)));
  [
    ["ta", "aria-label"],
    ["tt", "title"],
    ["tp", "placeholder"],
  ].forEach(([dataKey, attr]) =>
    document
      .querySelectorAll(`[data-${dataKey}]`)
      .forEach((element) =>
        element.setAttribute(attr, t(element.dataset[dataKey])),
      ),
  );
}
applyTranslations();
// после каждого действия: результаты на экран, состояние в localStorage
subscribe(renderResults);
subscribe(() => {
  if (!save(state)) toast(t("stale"));
});
watchOtherTabs(() => toast(t("stale")));
restore(loadSaved());
buildGpuSelect();
buildCameraSelect();
writeSystemForm();
writeForm(activeType());
route();
