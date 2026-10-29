// Точка входа: подключает интерфейс к состоянию, загружает сохранение и показывает страницу.
// Модули ui навешивают обработчики при импорте; подсказки — последними, когда разметка полей готова.
import { StrictMode, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { t } from "./i18n/index.ts";
import { loadSaved, save, watchOtherTabs } from "./app/persistence.ts";
import { activeType, restore, state, subscribe } from "./app/store.ts";
import { TypeTabs } from "./ui/calculation/TypeTabs.tsx";
import { TypeResult } from "./ui/calculation/type-result/TypeResult.tsx";
import { byId } from "./ui/dom.ts";
import { buildCameraSelect } from "./ui/object-cards.ts";
import { renderResults } from "./ui/render.ts";
import { route } from "./ui/router.ts";
import { buildGpuSelect, writeSystemForm } from "./ui/system-panel.ts";
import { toast } from "./ui/toast.ts";
import { applyTranslations } from "./ui/translations.ts";
import { writeForm } from "./ui/type-form.ts";
import "./ui/file-actions.ts";
import "./ui/report.ts";
import "./ui/popover.ts";

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
// компонент React в контейнере из index.html, пока страницу не собирает App.tsx;
// первая отрисовка сразу, а не по частям в следующих задачах: страница готова, когда скрипт выполнен
const mount = (id: string, component: ReactNode) => {
  const root = createRoot(byId(id));
  flushSync(() => root.render(<StrictMode>{component}</StrictMode>));
};
mount("tabs", <TypeTabs />);
mount("typeResult", <TypeResult />);
