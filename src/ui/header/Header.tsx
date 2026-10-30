// Шапка: переход между расчётом и шаблонами, копирование отчёта, язык и тема. На телефоне всё это в меню.
import { useEffect, useState } from "react";
import { LANG, LANG_KEY, t, type Lang } from "../../i18n/index.ts";
import { state, toggleTheme } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { useHashRoute } from "../hooks/useHashRoute.ts";
import { reportText } from "../lib/report.ts";

// выбранный язык сохраняется, страница перезагружается уже на нём;
// если сохранить нельзя, язык передаётся в адресе (?lang=)
function switchLanguage(lang: Lang) {
  const url = new URL(location.href);
  try {
    localStorage.setItem(LANG_KEY, lang);
    url.searchParams.delete("lang");
  } catch {
    url.searchParams.set("lang", lang);
  }
  history.replaceState(history.state, "", url);
  location.reload();
}

// значки 20 × 20: солнце — включить светлую тему, луна — тёмную
const SUN = (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <circle
      cx="10"
      cy="10"
      r="3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M10 1.5v2.5M10 16v2.5M1.5 10H4M16 10h2.5M4 4l1.8 1.8M14.2 14.2 16 16M4 16l1.8-1.8M14.2 5.8 16 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);
const MOON = (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
    <path
      d="M16.5 12.5A7 7 0 0 1 7.5 3.5a7 7 0 1 0 9 9Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

export function Header() {
  const computed = useComputed();
  const route = useHashRoute();
  const templates = route.startsWith("tpl-");
  const { light } = state;
  const [menuOpen, setMenuOpen] = useState(false);
  const otherLang = LANG === "en" ? "ru" : "en";

  // тема — класс на <html>, а <html> вне дерева React
  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  const copyReport = () =>
    navigator.clipboard.writeText(reportText(computed)).then(
      () => toast(t("reportCopied")),
      () => toast(t("copyFail")),
    );

  return (
    // на телефоне экраны типа и системы вместо шапки показывают свою верхнюю строку
    <header className={route === "type" || route === "system" ? "inner" : ""}>
      <h1>{t("appTitle")}</h1>
      <button
        type="button"
        className="icon menubtn"
        aria-label={t("menuAria")}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div
        className="hmenu"
        data-open={menuOpen}
        onClick={() => setMenuOpen(false)}
      >
        <nav className="appnav" aria-label={t("appNav")}>
          <a href="#" aria-current={templates ? undefined : "page"}>
            {t("calculationNav")}
          </a>
          <a
            href="#tpl-gpus"
            id="templatesBtn"
            aria-current={templates ? "page" : undefined}
          >
            {t("templatesBtn")}
          </a>
        </nav>
        <div className="acts">
          <button
            type="button"
            id="copyBtn"
            className="primary"
            onClick={copyReport}
          >
            {t("copyBtn")}
          </button>
          <button
            type="button"
            id="langBtn"
            className="icon"
            lang={otherLang}
            aria-label={t("langAria")}
            title={t("langAria")}
            onClick={() => switchLanguage(otherLang)}
          >
            {t("langBtn")}
          </button>
          <button
            type="button"
            id="themeBtn"
            className="icon"
            aria-label={t("themeLight")}
            title={t("themeLight")}
            aria-pressed={light}
            onClick={toggleTheme}
          >
            {light ? MOON : SUN}
          </button>
        </div>
      </div>
    </header>
  );
}
