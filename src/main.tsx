// Точка входа: подключает сохранение к состоянию, загружает сохранение и отрисовывает страницу.
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { LANG, t } from "./i18n/index.ts";
import { loadSaved, save, watchOtherTabs } from "./app/persistence.ts";
import { restore, state, subscribe } from "./app/store.ts";
import { App } from "./ui/App.tsx";
import { toast } from "./ui/components/Toast.tsx";

document.documentElement.lang = LANG;
document.title = t("docTitle");
// после каждого действия состояние сохраняется в localStorage
subscribe(() => {
  if (!save(state)) toast(t("stale"));
});
watchOtherTabs(() => toast(t("stale")));
restore(loadSaved());

const root = createRoot(document.getElementById("root")!);
// первая отрисовка сразу, а не по частям в следующих задачах: страница готова, когда скрипт выполнен
flushSync(() =>
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
);
