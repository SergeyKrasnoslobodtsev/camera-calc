// Подписи, общие для результата, панели системы и отчёта.
import { displayName, formatNumber } from "../../i18n/index.ts";
import { resolutionLabel } from "../../i18n/domain-text.ts";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from "../../domain/references/resolutions.ts";
import { cameraById, modelById, type TypeOutcome } from "../../app/store.ts";

// доля ресурса (1 = 100%) в процентах
export const percent = (share: number) => formatNumber(share * 100, 0) + "%";
// статус типа в списке и сводке: тип с ошибкой во вводе считается непрошедшим
export const typeStatus = (result: TypeOutcome) =>
  result.ok ? result.status : "bad";

export const modelName = (obj: { model: string }) =>
  (modelById(obj.model) || { name: "?" }).name;
// камера типа: из шаблона или разрешение, заданное вручную
export const cameraLabel = ({
  type,
}: {
  type: { inputs: { camera: string; resolution: string | number } };
}) => {
  const camera = cameraById(type.inputs.camera);
  return camera
    ? displayName(camera)
    : resolutionLabel(
        RESOLUTIONS[+type.inputs.resolution] ?? DEFAULT_RESOLUTION,
      );
};
