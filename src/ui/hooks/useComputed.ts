// Результаты расчёта для компонентов: компонент перерисовывается после каждого действия store.
import { useSyncExternalStore } from "react";
import { computed, subscribe } from "../app/store.ts";

export const useComputed = () =>
  useSyncExternalStore(subscribe, () => computed);
