// Подписи, общие для результата, панели системы и отчёта.
import { displayName } from "../../i18n/index.ts";
import { resolutionLabel } from "../../i18n/domain-text.ts";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from "../../domain/references/resolutions.ts";
import { cameraById, modelById } from "../../app/store.ts";

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
