// Формат матрицы: дюймовый формат с шириной активной области, расчёт по размеру пикселя или своя ширина.
// Дюймовый формат условный, у разных производителей ширина отличается; источник значений не указан.
export type SensorPreset =
  | { kind: "format"; format: string; widthMm: number }
  | { kind: "pixelPitch" } // ширина = размер пикселя × ширина кадра в px
  | { kind: "custom" }; // ширина задаётся вручную

export const SENSORS: readonly SensorPreset[] = [
  { kind: "format", format: '1/3"', widthMm: 4.8 },
  { kind: "format", format: '1/2.9"', widthMm: 5.0 },
  { kind: "format", format: '1/2.8"', widthMm: 5.6 },
  { kind: "format", format: '1/2.7"', widthMm: 5.4 },
  { kind: "format", format: '1/2.5"', widthMm: 5.8 },
  { kind: "format", format: '1/1.8" 16:9', widthMm: 7.7 },
  { kind: "format", format: '1/1.2" 16:9', widthMm: 11.2 },
  { kind: "pixelPitch" },
  { kind: "custom" },
];
// формат, если индекс в типе камер не найден
export const DEFAULT_SENSOR = SENSORS[3];
