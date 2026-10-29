import { readFields, result, type ParseResult } from "./parse-result.ts";

// Камера из шаблона: кадр, матрица и диапазон фокусного расстояния объектива.
// Поля Nw и Nh хранятся в сохранениях и файлах экспорта, поэтому имена не меняются.
export type Camera = {
  id: string;
  name?: string; // своя камера
  nameKey?: string; // встроенная камера: ключ названия в словаре i18n
  Nw: number; // ширина кадра, px
  Nh: number; // высота кадра, px
  sensorWidth: number; // ширина активной области матрицы, мм
  focalMin: number; // мм; 0 — фокусное расстояние не ограничено
  focalMax: number; // мм
  price?: number; // $
  custom?: true;
};

// Своя камера: имя, кадр в целых пикселях и ширина матрицы обязательны. Фокус 0 — объектив не ограничен,
// иначе «от» не больше «до». Цена 0 или нет — неизвестна.
export function parseCamera(raw: unknown): ParseResult<Camera> {
  const read = readFields(raw);
  const camera: Camera = {
    id: read.text("id"),
    name: read.text("name"),
    Nw: read.positive("Nw"),
    Nh: read.positive("Nh"),
    sensorWidth: read.positive("sensorWidth"),
    focalMin: read.nonNegative("focalMin"),
    focalMax: read.nonNegative("focalMax"),
  };
  read.integer("Nw", camera.Nw);
  read.integer("Nh", camera.Nh);
  read.order("focalMax", camera.focalMin <= camera.focalMax);
  if (read.record.price !== undefined) camera.price = read.nonNegative("price");
  if (read.record.custom === true) camera.custom = true;
  return result(read.errors, camera);
}
