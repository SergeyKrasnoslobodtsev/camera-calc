// Шапка: тема, язык, экран шаблонов, пример вместо текущих данных, копирование отчёта.
import { useEffect } from "react";
import { LANG, LANG_KEY, t, type Lang } from "../../i18n/index.ts";
import { resetToExample, state, toggleTheme } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
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

function loadExample() {
  resetToExample();
  toast(t("exampleLoaded"));
}

export function Header() {
  const computed = useComputed();
  const { light } = state;
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
    <header>
      <h1>{t("appTitle")}</h1>
      <div className="acts">
        <button
          type="button"
          id="themeBtn"
          aria-pressed={light}
          onClick={toggleTheme}
        >
          {t(light ? "themeDark" : "themeLight")}
        </button>
        <button
          type="button"
          id="langBtn"
          lang={otherLang}
          aria-label={t("langAria")}
          onClick={() => switchLanguage(otherLang)}
        >
          {t("langBtn")}
        </button>
        <a className="btn" href="#tpl-gpus" id="templatesBtn">
          {t("templatesBtn")}
        </a>
        <button type="button" id="resetBtn" onClick={loadExample}>
          {t("resetBtn")}
        </button>
        <button
          type="button"
          id="copyBtn"
          className="primary"
          onClick={copyReport}
        >
          {t("copyBtn")}
        </button>
      </div>
    </header>
  );
}
