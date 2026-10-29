// Отрисовка результатов после каждого действия: подписчик store.
import { activeType, computed, state } from "../app/store.ts";
import { syncFormUI } from "./object-cards.ts";
import { renderSystem } from "./system-panel.ts";
import { applyTheme } from "./theme.ts";
import { renderType } from "./type-result.ts";

export function renderResults() {
  const { results, system, totals } = computed;
  const activeIndex = state.cameraTypes.indexOf(activeType());
  syncFormUI(activeType(), results[activeIndex]);
  renderType(results[activeIndex]);
  renderSystem(results, system, totals);
  applyTheme();
}
