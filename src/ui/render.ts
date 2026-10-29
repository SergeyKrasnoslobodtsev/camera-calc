// Отрисовка результатов после каждого действия: подписчик store.
import { activeType, computed, state } from "../app/store.ts";
import { renderObjectResults, syncFormUI } from "./object-cards.ts";
import { renderSystem } from "./system-panel.ts";
import { applyTheme } from "./theme.ts";

export function renderResults() {
  const { results, system, totals } = computed;
  const activeIndex = state.cameraTypes.indexOf(activeType());
  syncFormUI(activeType(), results[activeIndex]);
  renderObjectResults(results[activeIndex]);
  renderSystem(results, system, totals);
  applyTheme();
}
