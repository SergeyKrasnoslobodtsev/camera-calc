// Запуск до отрисовки: язык страницы, сохранение после каждого действия, загрузка сохранения.
// Вызывают main.tsx и тесты страницы.
import { LANG, LANG_KEY, t } from "./i18n/index.ts";
import { loadSaved, save, watchOtherTabs } from "./app/persistence.ts";
import { restore, state, subscribe } from "./app/store.ts";
import { toast } from "./ui/components/Toast.tsx";

export function start() {
  document.documentElement.lang = LANG;
  document.title = t("docTitle");
  // после каждого действия состояние сохраняется в localStorage
  subscribe(() => {
    if (!save(state)) toast(t("stale"));
  });
  watchOtherTabs(() => toast(t("stale")));
  // язык, выбранный в другой вкладке, действует после обновления страницы
  addEventListener("storage", (event) => {
    if (event.key === LANG_KEY && event.newValue !== LANG)
      toast(t("langStale"));
  });
  restore(loadSaved());
}
