// Язык страницы: тексты статичной разметки и кнопка смены языка.
import { LANG, LANG_KEY, t, type TextKey } from "../i18n/index.ts";
import { byId } from "./dom.ts";
import { toast } from "./toast.ts";

// тексты статичной разметки: ключи словаря в атрибутах data-t, data-ta, data-tt, data-tp
export function applyTranslations() {
  document.documentElement.lang = LANG;
  document.title = t("docTitle");
  document
    .querySelectorAll<HTMLElement>("#formulas>[lang]")
    .forEach((block) => (block.hidden = block.lang !== LANG));
  document
    .querySelectorAll<HTMLElement>("[data-t]")
    .forEach(
      (element) => (element.textContent = t(element.dataset.t as TextKey)),
    );
  [
    ["ta", "aria-label"],
    ["tt", "title"],
    ["tp", "placeholder"],
  ].forEach(([dataKey, attr]) =>
    document
      .querySelectorAll<HTMLElement>(`[data-${dataKey}]`)
      .forEach((element) =>
        element.setAttribute(attr, t(element.dataset[dataKey] as TextKey)),
      ),
  );
}
// другой язык сохраняется, и страница перезагружается
const langButton = byId("langBtn");
langButton.lang = LANG === "en" ? "ru" : "en";
langButton.addEventListener("click", () => {
  try {
    localStorage.setItem(LANG_KEY, langButton.lang);
  } catch (error) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
});
