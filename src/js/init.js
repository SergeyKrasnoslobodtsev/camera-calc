import { applyTranslations } from "./i18n.js";
// system-ui импортируется раньше state: при загрузке он берёт OBJECT_PRESETS из state, а если первым
// импортировать state, то по кругу state → objects → system-ui модуль system-ui выполнится раньше state
import { buildGpuSelect, calcAll, load, route } from "./system-ui.js";
import { buildCameraSelect } from "./objects.js";
import { activeType, writeForm } from "./state.js";
import "./popover.js";
applyTranslations();
buildGpuSelect();
buildCameraSelect();
load();
writeForm(activeType());
calcAll();
route();
