// Маршрутизация по адресу после #: пусто — расчёт, tpl-* — экраны шаблонов.
import { byId } from "./dom.ts";
import { renderCamView } from "./templates-cameras.ts";
import { renderDetView } from "./templates-detectors.ts";
import { renderGpuView } from "./templates-gpus.ts";

const TEMPLATE_VIEWS: Record<string, () => void> = {
  "tpl-gpus": renderGpuView,
  "tpl-cams": renderCamView,
  "tpl-dets": renderDetView,
};
export function route() {
  const hash = location.hash.slice(1),
    isTemplate = hash in TEMPLATE_VIEWS;
  byId("viewMain").style.display = isTemplate ? "none" : "flex";
  byId("viewTemplates").hidden = !isTemplate;
  byId("viewTemplates").style.display = isTemplate ? "flex" : "none";
  if (isTemplate) {
    Object.keys(TEMPLATE_VIEWS).forEach((view) => {
      byId("templatePage-" + view.slice(4)).hidden = view !== hash;
      byId("templatePage-" + view.slice(4)).style.display =
        view === hash ? "flex" : "none";
      const link = byId("templateTab-" + view.slice(4));
      if (view === hash) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    TEMPLATE_VIEWS[hash]();
  }
  try {
    window.scrollTo(0, 0);
  } catch (error) {}
}
window.addEventListener("hashchange", route);
