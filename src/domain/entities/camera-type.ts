// Тип камер — группа одинаковых камер с общей геометрией, матрицей, потоком и объектами.
// Пока значения хранятся так, как их дала форма или шаблон, и разбираются при расчёте (parseNum).

// значение поля: строка из формы или число из шаблона
export type FormValue = string | number;

export type Placement = "side" | "top";
export type LensMode = "auto" | "focal" | "angle";
export type Orientation = "auto" | "landscape" | "portrait";
export type FeedMode = "full" | "roi" | "tiles";

export type CameraTypeInputs = {
  camera: string; // id камеры из шаблона, "" — ручная настройка матрицы
  cameraHeight: FormValue; // H, м
  planeHeight: FormValue; // h, м
  zoneStart: FormValue; // вынос до зоны, м
  zoneDepth: FormValue; // м
  zoneWidth: FormValue; // м
  margin: FormValue; // запас кадра, %
  resolution: FormValue; // индекс в RESOLUTIONS
  sensor: FormValue; // индекс в SENSORS
  sensorWidth: FormValue; // мм
  pixelPitch: FormValue; // мкм
  orientation: Orientation;
  focalLength: FormValue; // мм
  hfov: FormValue; // °
  fps: FormValue; // частота потока, кадр/с
  analyticsFps: FormValue; // частота для аналитики, кадр/с
  codec: FormValue; // бит на пиксель кадра: 0.04 — H.265, 0.07 — H.264
  scene: FormValue; // множитель битрейта от движения в сцене
  lensFactor: FormValue; // k — доля разрешения, которая доходит до модели
  speed: FormValue; // скорость движения, м/с
  blurPx: FormValue; // допустимый смаз, px
  lensMode: LensMode;
  placement: Placement;
};

export type SceneObject = {
  name: string;
  nameKey?: string; // ключ встроенного названия в словаре i18n
  width: FormValue; // см, поперёк взгляда камеры
  length: FormValue; // см, вдоль
  height: FormValue; // см
  requiredPx: FormValue; // порог на меньшую сторону объекта на входе модели, px
  model: string; // id модели из каталога или своего детектора
  feed: FeedMode;
  inputSize: FormValue; // сторона входа модели, px
  overlap: FormValue; // перекрытие тайлов, %
};

export type CameraType = {
  id: string;
  name: string;
  nameKey?: string;
  count: FormValue;
  inputs: CameraTypeInputs;
  objects: SceneObject[];
};
