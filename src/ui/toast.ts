// Уведомление внизу страницы, скрывается само.
import { byId } from "./dom.ts";

let timer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  const toastEl = byId("toast");
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => (toastEl.hidden = true), 1800);
}
