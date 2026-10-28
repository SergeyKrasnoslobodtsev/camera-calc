// Тип камер — группа одинаковых камер с общей геометрией, матрицей, потоком и объектами.
// Пока значения хранятся так, как их дала форма или шаблон, и разбираются при расчёте (parseNum).

import { readFields, result, type ParseResult } from "./parse-result.ts";

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

const PLACEMENTS: readonly Placement[] = ["side", "top"];
const LENS_MODES: readonly LensMode[] = ["auto", "focal", "angle"];
const ORIENTATIONS: readonly Orientation[] = ["auto", "landscape", "portrait"];
const FEED_MODES: readonly FeedMode[] = ["full", "roi", "tiles"];

const withNameKey = <T extends { nameKey?: string }>(
  item: T,
  nameKey: unknown,
) => {
  if (typeof nameKey === "string") item.nameKey = nameKey;
  return item;
};

// Черновик объекта: числа — как введены, проверяются при расчёте; подача — из списка
export function parseSceneObject(raw: unknown): ParseResult<SceneObject> {
  const read = readFields(raw);
  const object: SceneObject = {
    name: read.string("name"),
    width: read.formValue("width"),
    length: read.formValue("length"),
    height: read.formValue("height"),
    requiredPx: read.formValue("requiredPx"),
    model: read.text("model"),
    feed: read.oneOf("feed", FEED_MODES),
    inputSize: read.formValue("inputSize"),
    overlap: read.formValue("overlap"),
  };
  return result(read.errors, withNameKey(object, read.record.nameKey));
}

// Черновик типа камер: проверяется устройство записи и значения из списков, числа — при расчёте.
// Ошибки объектов и полей inputs — с путём, например "objects.0.feed", "inputs.placement".
export function parseCameraType(raw: unknown): ParseResult<CameraType> {
  const read = readFields(raw);
  const inputs = readFields(read.record.inputs, "inputs.");
  const rawObjects = read.record.objects;
  if (!Array.isArray(rawObjects))
    read.errors.push({ field: "objects", code: "required" });
  const objects = (Array.isArray(rawObjects) ? rawObjects : []).map(
    parseSceneObject,
  );
  const type: CameraType = {
    id: read.text("id"),
    name: read.string("name"),
    count: read.formValue("count"),
    inputs: {
      camera: inputs.string("camera"),
      cameraHeight: inputs.formValue("cameraHeight"),
      planeHeight: inputs.formValue("planeHeight"),
      zoneStart: inputs.formValue("zoneStart"),
      zoneDepth: inputs.formValue("zoneDepth"),
      zoneWidth: inputs.formValue("zoneWidth"),
      margin: inputs.formValue("margin"),
      resolution: inputs.formValue("resolution"),
      sensor: inputs.formValue("sensor"),
      sensorWidth: inputs.formValue("sensorWidth"),
      pixelPitch: inputs.formValue("pixelPitch"),
      orientation: inputs.oneOf("orientation", ORIENTATIONS),
      focalLength: inputs.formValue("focalLength"),
      hfov: inputs.formValue("hfov"),
      fps: inputs.formValue("fps"),
      analyticsFps: inputs.formValue("analyticsFps"),
      codec: inputs.formValue("codec"),
      scene: inputs.formValue("scene"),
      lensFactor: inputs.formValue("lensFactor"),
      speed: inputs.formValue("speed"),
      blurPx: inputs.formValue("blurPx"),
      lensMode: inputs.oneOf("lensMode", LENS_MODES),
      placement: inputs.oneOf("placement", PLACEMENTS),
    },
    objects: objects.flatMap((object) => (object.ok ? [object.value] : [])),
  };
  const errors = [
    ...read.errors,
    ...inputs.errors,
    ...objects.flatMap((object, i) =>
      object.ok
        ? []
        : object.errors.map((error) => ({
            ...error,
            field: `objects.${i}.${error.field}`,
          })),
    ),
  ];
  return result(errors, withNameKey(type, read.record.nameKey));
}
