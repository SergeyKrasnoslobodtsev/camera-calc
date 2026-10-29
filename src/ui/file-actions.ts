// Кнопки данных: пример вместо текущих типов, экспорт в файл и импорт из файла.
import { t } from "../i18n/index.ts";
import { exportText, importText } from "../app/persistence.ts";
import { activeType, resetToExample, state } from "../app/store.ts";
import { byId } from "./dom.ts";
import { buildRefGpuSelect } from "./templates-detectors.ts";
import { toast } from "./toast.ts";
import { writeForm } from "./type-form.ts";

byId("resetBtn").addEventListener("click", () => {
  resetToExample();
  buildRefGpuSelect();
  writeForm(activeType());
  toast(t("exampleLoaded"));
});
byId("exportBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([exportText(state)], {
      type: "application/json",
    }),
  );
  link.download = "camera-calc.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
// импорт заменяет все данные, поэтому выполняется по второму нажатию в течение 3 с
let importTimer: ReturnType<typeof setTimeout> | null = null;
byId("importBtn").addEventListener("click", () => {
  const button = byId("importBtn");
  if (!importTimer) {
    button.textContent = t("importConfirm");
    importTimer = setTimeout(() => {
      button.textContent = t("importBtn");
      importTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(importTimer);
  importTimer = null;
  button.textContent = t("importBtn");
  byId("importFile").click();
});
const importFile = byId<HTMLInputElement>("importFile");
importFile.addEventListener("change", () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (file)
    file.text().then(
      (text) => {
        const status = importText(text);
        if (status === "ok") location.reload();
        else toast(t(status));
      },
      () => toast(t("readFail")),
    );
});
