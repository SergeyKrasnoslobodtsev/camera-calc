import { LANG, t } from "../i18n/index.ts";
// system-ui импортируется раньше state: при загрузке он берёт OBJECT_PRESETS из state, а если первым
// импортировать state, то по кругу state → objects → system-ui модуль system-ui выполнится раньше state
import { buildGpuSelect, calcAll, load, route } from "./system-ui.js";
import { buildCameraSelect } from "./objects.js";
import { activeType, writeForm } from "./state.js";
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
buildGpuSelect();
buildCameraSelect();
load();
writeForm(activeType());
calcAll();
route();
