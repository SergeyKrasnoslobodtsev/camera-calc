// Уведомление внизу страницы: toast(text) показывает его, через 1,8 с оно скрывается само.
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const SHOW_MS = 1800;

// id отличает новое уведомление от прежнего с тем же текстом
type Message = { id: number; text: string };
let message: Message | null = null;
let nextId = 0;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setMessage(next: Message | null) {
  message = next;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// вызывается и вне компонентов, например из подписчика store
export function toast(text: string) {
  setMessage({ id: nextId++, text });
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => setMessage(null), SHOW_MS);
}

export function Toast() {
  const current = useSyncExternalStore(subscribe, () => message);
  return createPortal(
    <div
      key={current?.id}
      className="toast"
      id="toast"
      role="status"
      hidden={!current}
    >
      {current?.text}
    </div>,
    document.body,
  );
}
