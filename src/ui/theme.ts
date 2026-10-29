// Светлая и тёмная тема: класс на <html> и кнопка переключения.
import { t } from "../i18n/index.ts";
import { state, toggleTheme } from "../app/store.ts";
import { byId } from "./dom.ts";

export function applyTheme() {
  document.documentElement.classList.toggle("light", state.light);
  byId("themeBtn").textContent = t(state.light ? "themeDark" : "themeLight");
  byId("themeBtn").setAttribute("aria-pressed", String(state.light));
}
byId("themeBtn").addEventListener("click", toggleTheme);
