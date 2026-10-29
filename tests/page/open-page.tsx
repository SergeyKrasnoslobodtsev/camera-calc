// Страница в тестах: те же шаги, что в main.tsx, только отрисовывает Testing Library.
// Каждый вызов — как новое открытие страницы: модули загружаются заново, поэтому язык и сохранение
// снова читаются из localStorage, а прежняя страница размонтируется.
import { StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { vi } from "vitest";

type Options = {
  saved?: string | null; // сохранение в localStorage
  lang?: string | null; // выбранный язык; null — не выбран
  browserLang?: string; // язык браузера
};

export async function openPage({
  saved = null,
  lang = "ru",
  browserLang = "en-US",
}: Options = {}) {
  cleanup();
  localStorage.clear();
  if (saved) localStorage.setItem("camcalc4", saved);
  if (lang) localStorage.setItem("camcalc-lang", lang);
  Object.defineProperty(navigator, "language", {
    value: browserLang,
    configurable: true,
  });
  // как в Chrome: scrollTo возвращает Promise, а не undefined
  window.scrollTo = () => Promise.resolve() as never;
  history.replaceState(null, "", "/");
  vi.resetModules();
  const { start } = await import("../../src/start.ts");
  const { App } = await import("../../src/ui/App.tsx");
  start();
  const root = document.createElement("div");
  root.className = "wrap";
  root.id = "root";
  render(
    <StrictMode>
      <App />
    </StrictMode>,
    { container: document.body.appendChild(root) },
  );
}
