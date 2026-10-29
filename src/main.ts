// Точка входа: подключает интерфейс к состоянию, загружает сохранение и показывает страницу.
// Модули ui навешивают обработчики при импорте; подсказки — последними, когда разметка полей готова.
import { t } from "./i18n/index.ts";
import { loadSaved, save, watchOtherTabs } from "./app/persistence.ts";
import { activeType, restore, state, subscribe } from "./app/store.ts";
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
