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
