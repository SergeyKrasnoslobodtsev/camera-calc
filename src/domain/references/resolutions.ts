export type Resolution = { megapixels: number; width: number; height: number };

// разрешения потока камеры, по возрастанию ширины кадра
export const RESOLUTIONS: readonly Resolution[] = [
  { megapixels: 2, width: 1920, height: 1080 },
  { megapixels: 4, width: 2560, height: 1440 },
  { megapixels: 5, width: 2592, height: 1944 },
  { megapixels: 5, width: 2880, height: 1620 },
  { megapixels: 6, width: 3072, height: 2048 },
  { megapixels: 8, width: 3840, height: 2160 },
  { megapixels: 12, width: 4000, height: 3000 },
];
// разрешение, если индекс в типе камер не найден
export const DEFAULT_RESOLUTION = RESOLUTIONS[1];
