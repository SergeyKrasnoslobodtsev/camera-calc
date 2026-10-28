import type { Camera } from "../entities/camera.ts";

// типовые камеры-примеры; название — в словаре i18n по nameKey
export const BUILTIN_CAMERAS: readonly Camera[] = [
  {
    id: "k4",
    nameKey: "builtinCameraNames.k4",
    Nw: 2560,
    Nh: 1440,
    sensorWidth: 5.4,
    focalMin: 2.8,
    focalMax: 12,
  },
  {
    id: "k8",
    nameKey: "builtinCameraNames.k8",
    Nw: 3840,
    Nh: 2160,
    sensorWidth: 7.68,
    focalMin: 2.8,
    focalMax: 12,
  },
];
