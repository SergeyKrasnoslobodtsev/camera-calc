// Тип камер — группа одинаковых камер с общей геометрией, матрицей, потоком и объектами.
// В store и в сохранении тип хранится черновиком: числа — строки из формы или числа из шаблона.
// Разбор переводит черновик в числа для расчёта.

import { readFields, result, type ParseResult } from "./parse-result.ts";

export type Placement = "side" | "top";
export type LensMode = "auto" | "focal" | "angle";
export type Orientation = "auto" | "landscape" | "portrait";
export type FeedMode = "full" | "roi" | "tiles";

export type CameraTypeInputs = {
  camera: string; // id камеры из шаблона, "" — ручная настройка матрицы
  cameraHeight: number; // H, м
  planeHeight: number; // h, м
  zoneStart: number; // вынос до зоны, м
  zoneDepth: number; // м
  zoneWidth: number; // м
  margin: number; // запас кадра, %
  resolution: number; // индекс в RESOLUTIONS
  sensor: number; // индекс в SENSORS
  sensorWidth: number; // мм
  pixelPitch: number; // мкм
  orientation: Orientation;
  focalLength: number; // мм
  hfov: number; // °
  fps: number; // частота потока, кадр/с
  analyticsFps: number; // частота для аналитики, кадр/с
  codec: number; // бит на пиксель кадра: 0.04 — H.265, 0.07 — H.264
  scene: number; // множитель битрейта от движения в сцене
  lensFactor: number; // k — доля разрешения, которая доходит до модели
  speed: number; // скорость движения, м/с
  blurPx: number; // допустимый смаз, px
  lensMode: LensMode;
  placement: Placement;
};

export type SceneObject = {
  name: string;
  nameKey?: string; // ключ встроенного названия в словаре i18n
  width: number; // см, поперёк взгляда камеры
  length: number; // см, вдоль
  height: number; // см
  requiredPx: number; // порог на меньшую сторону объекта на входе модели, px
  model: string; // id модели из каталога или своего детектора
  feed: FeedMode;
  inputSize: number; // сторона входа модели, px
  overlap: number; // перекрытие тайлов, %
};

export type CameraType = {
  id: string;
  name: string;
  nameKey?: string;
  count: number; // целое ≥ 0
  inputs: CameraTypeInputs;
  objects: SceneObject[];
};

// вход модели, если в объекте не задан, px
const DEFAULT_INPUT_SIZE = 640;

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

// Объект из черновика: числа разбираются, пустые и не числа — NaN, их отсекает расчёт; отрицательные — ошибка;
// подача — из списка. Без входа модели — DEFAULT_INPUT_SIZE, перекрытие обязательно.
export function parseSceneObject(raw: unknown): ParseResult<SceneObject> {
  const read = readFields(raw);
  const object: SceneObject = {
    name: read.string("name"),
    width: read.number("width"),
    length: read.number("length"),
    height: read.number("height"),
    requiredPx: read.number("requiredPx"),
    model: read.text("model"),
    feed: read.oneOf("feed", FEED_MODES),
    inputSize: read.number("inputSize") || DEFAULT_INPUT_SIZE,
    overlap: read.requiredNumber("overlap"),
  };
  return result(read.errors, withNameKey(object, read.record.nameKey));
}

// Тип камер из черновика: числа разбираются, как у объекта. Число камер — целое, не меньше 0,
// число камер и запас кадра обязательны. Индексы и значения списков (resolution, sensor, codec, scene)
// переводятся в число Number: пустая строка — 0.
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
  const count = read.requiredNumber("count");
  read.integer("count", count);
  const type: CameraType = {
    id: read.text("id"),
    name: read.string("name"),
    count,
    inputs: {
      camera: inputs.string("camera"),
      cameraHeight: inputs.number("cameraHeight"),
      planeHeight: inputs.number("planeHeight"),
      zoneStart: inputs.number("zoneStart"),
      zoneDepth: inputs.number("zoneDepth"),
      zoneWidth: inputs.number("zoneWidth"),
      margin: inputs.requiredNumber("margin"),
      resolution: Number(inputs.formValue("resolution")),
      sensor: Number(inputs.formValue("sensor")),
      sensorWidth: inputs.number("sensorWidth"),
      pixelPitch: inputs.number("pixelPitch"),
      orientation: inputs.oneOf("orientation", ORIENTATIONS),
      focalLength: inputs.number("focalLength"),
      hfov: inputs.number("hfov"),
      fps: inputs.number("fps"),
      analyticsFps: inputs.number("analyticsFps"),
      codec: Number(inputs.formValue("codec")),
      scene: Number(inputs.formValue("scene")),
      lensFactor: inputs.number("lensFactor"),
      speed: inputs.number("speed"),
      blurPx: inputs.number("blurPx"),
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
