// Действия на странице и чтение её содержимого так, как это видит пользователь.
import { act, fireEvent } from "@testing-library/react";
import { openPage } from "./open-page.tsx";

export const T = (id) =>
  document.getElementById(id).textContent.replace(/\s+/g, " ").trim();
export const tbl = (id) =>
  [...document.querySelectorAll("#" + id + " tr")]
    .map(
      (r) =>
        "   " +
        [...r.children]
          .map((c) => c.textContent.replace(/\s+/g, " ").trim())
          .join(" | "),
    )
    .join("\n");
export const legend = () =>
  [...document.querySelectorAll("#legend li")]
    .map((l) => l.textContent.replace(/\s+/g, " ").trim())
    .join(" || ");
export const go = (hash) =>
  act(() => {
    location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
export const enter = (id, value) =>
  fireEvent.input(document.getElementById(id), { target: { value } });
export const choose = (id, value) =>
  fireEvent.change(document.getElementById(id), { target: { value } });
export const submit = (id) => fireEvent.submit(document.getElementById(id));

// отчёт так, как его получает пользователь: кнопка «Копировать отчёт» пишет его в буфер обмена;
// запись не завершается, чтобы уведомление «Отчёт скопирован» не заменило другие
export const reportOf = () => {
  let copied;
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: (text) => ((copied = text), new Promise(() => {})) },
    configurable: true,
  });
  fireEvent.click(document.getElementById("copyBtn"));
  return copied;
};

// импорт через поле выбора файла; then вызывается сразу, чтобы проверки шли без ожидания
export const importFile = (text) => {
  const input = document.getElementById("importFile");
  Object.defineProperty(input, "files", {
    // oxlint-disable-next-line unicorn/no-thenable -- синхронный then нужен намеренно
    value: [{ text: () => ({ then: (onRead) => onRead(text) }) }],
    configurable: true,
  });
  fireEvent.change(input);
};

// перезагрузку страницы jsdom не выполняет, а сообщает об ошибке «Not implemented: navigation»;
// jsdom — окно, которое создал Vitest
export function countReloads() {
  const reloads = { count: 0 };
  jsdom.virtualConsole.removeAllListeners("jsdomError");
  jsdom.virtualConsole.on("jsdomError", (error) => {
    if (/navigation/.test(error.message)) reloads.count++;
    else console.error(error);
  });
  return reloads;
}

// своя камера и своя модель через формы шаблонов; камера выбрана в первом типе, модель — у второго объекта.
// Возвращает сохранение страницы (ex) и его же как файл экспорта (exp)
export async function addTemplates() {
  await openPage();
  go("#tpl-cams");
  enter("cameraFormName", "Тест-камера 8 Мп");
  enter("cameraFormWidth", "3840");
  enter("cameraFormHeight", "2160");
  enter("cameraFormPixelPitch", "2");
  enter("cameraFormFocalMin", "6");
  enter("cameraFormFocalMax", "6");
  enter("cameraFormPrice", "300");
  submit("cameraForm");
  go("#tpl-models");
  enter("modelFormName", "Детектор деталей");
  enter("modelFormFps", "900");
  choose("modelFormInput", "640");
  choose("modelFormRefGpu", "l40s");
  submit("modelForm");
  go("");
  const camera = [...document.getElementById("camera").options].find((o) =>
    o.text.startsWith("Тест-камера"),
  );
  choose("camera", camera.value);
  const customModelOption = [
    ...document.getElementById("objectModel-1").options,
  ].find((o) => o.text === "Детектор деталей");
  choose("objectModel-1", customModelOption.value);
  const ex = JSON.parse(localStorage.getItem("camcalc5"));
  return { ex, exp: JSON.stringify(ex, null, 1) };
}
