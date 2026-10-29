// Все данные в файл и из файла: экспорт сохранения и импорт с перезагрузкой страницы.
import { t } from "../../i18n/index.ts";
import { exportText, importText } from "../../app/persistence.ts";
import { state } from "../../app/store.ts";
import { toast } from "../components/Toast.tsx";

export function downloadState() {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([exportText(state)], { type: "application/json" }),
  );
  link.download = "camera-calc.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

// принятый файл заменяет все данные; страница перезагружается и показывает их
export function loadStateFile(file: File) {
  file.text().then(
    (text) => {
      const status = importText(text);
      if (status === "ok") location.reload();
      else toast(t(status));
    },
    () => toast(t("readFail")),
  );
}
