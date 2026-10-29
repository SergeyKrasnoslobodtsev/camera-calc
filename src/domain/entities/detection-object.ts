import { readFields, result, type ParseResult } from "./parse-result.ts";

// Объект детекции: что ищет модель — габариты и порог на меньшую сторону на входе модели.
// Объект сцены ссылается на него по id, габариты и порог подставляются перед расчётом.
export type DetectionObject = {
  id: string;
  name?: string; // свой объект
  nameKey?: string; // встроенный объект: ключ названия в словаре i18n
  width: number; // см, поперёк взгляда камеры
  length: number; // см, вдоль
  height: number; // см
  requiredPx: number; // px
  custom?: true;
};

// Свой объект детекции: имя, габариты и порог обязательны и больше нуля
export function parseDetectionObject(
  raw: unknown,
): ParseResult<DetectionObject> {
  const read = readFields(raw);
  const detectionObject: DetectionObject = {
    id: read.text("id"),
    name: read.text("name"),
    width: read.positive("width"),
    length: read.positive("length"),
    height: read.positive("height"),
    requiredPx: read.positive("requiredPx"),
    custom: true,
  };
  return result(read.errors, detectionObject);
}
