// Адрес после #: компонент перерисовывается, когда адрес меняется.
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export const useHashRoute = () =>
  useSyncExternalStore(subscribe, () => location.hash.slice(1));
