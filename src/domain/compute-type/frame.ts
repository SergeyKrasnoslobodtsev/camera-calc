import type { Camera } from "../entities/camera.ts";
import type { CameraTypeInputs } from "../entities/camera-type.ts";
import { DEFAULT_RESOLUTION, RESOLUTIONS } from "../references/resolutions.ts";
import { DEFAULT_SENSOR, SENSORS } from "../references/sensors.ts";

// Кадр потока до поворота камеры: width × height (Nw × Nh в формулах), px; sensorWidth (s), мм
export type Frame = { width: number; height: number; sensorWidth: number };

// камера из шаблона задаёт кадр и матрицу сама, иначе они берутся из полей типа камер
export function resolveFrame(
  inputs: CameraTypeInputs,
  camera: Camera | undefined,
): Frame {
  if (camera)
    return {
      width: camera.Nw,
      height: camera.Nh,
      sensorWidth: camera.sensorWidth,
    };
  const { width, height } =
    RESOLUTIONS[inputs.resolution] ?? DEFAULT_RESOLUTION;
  const sensor = SENSORS[inputs.sensor] ?? DEFAULT_SENSOR;
  const sensorWidth =
    sensor.kind === "format"
      ? sensor.widthMm
      : sensor.kind === "pixelPitch"
        ? (inputs.pixelPitch * width) / 1000 // мкм × px → мм
        : inputs.sensorWidth;
  return { width, height, sensorWidth };
}
