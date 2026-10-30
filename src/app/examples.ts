// Начальные данные: встроенный пример, новый объект, значения полей по умолчанию.
// Встроенные названия хранятся ключом словаря (nameKey), текст на языке интерфейса подставляет ui.
import type { ObjectDraft, SystemDraft, TypeDraft } from "./store.ts";

export const uid = () => Math.random().toString(36).slice(2, 9);

// объект типа: что ищет, подача; модель YOLO26s, вход 640
const detector = (target: string, feed: string): ObjectDraft => ({
  target,
  model: "y26s",
  feed,
  inputSize: 640,
  overlap: 20,
});
// объект, который добавляет кнопка «Добавить объект» и с которым создаётся новый тип
export const NEW_OBJECT = detector("person", "roi");

export const DEFAULT_INPUTS: TypeDraft["inputs"] = {
  camera: "",
  cameraHeight: "4",
  planeHeight: "0.9",
  zoneStart: "1.5",
  zoneDepth: "3",
  zoneWidth: "3",
  margin: "10",
  resolution: "1",
  sensor: "3",
  sensorWidth: "5.4",
  pixelPitch: "2.0",
  orientation: "auto",
  focalLength: "6",
  hfov: "50",
  fps: "12",
  analyticsFps: "5",
  codec: "0.04",
  scene: "1",
  lensFactor: "0.6",
  speed: "1",
  blurPx: "2",
  lensMode: "auto",
  placement: "side",
};

export const DEFAULT_SYSTEM: SystemDraft = {
  efficiency: "0.6",
  reserve: "20",
  archiveDays: "0",
  gpu: "auto",
  gpuCount: "auto",
};

// name — своё название; встроенное задаётся nameKey, тогда name пустое
export const makeType = (
  name: { name: string } | { nameKey: string },
  count: number,
  inputs: Partial<TypeDraft["inputs"]>,
  objects: readonly ObjectDraft[],
): TypeDraft => ({
  id: uid(),
  name: "",
  ...name,
  count: String(count),
  inputs: { ...DEFAULT_INPUTS, ...inputs },
  objects: objects.map((object) => ({ ...object })),
});

export const exampleTypes = () => [
  makeType({ nameKey: "typeNames.0" }, 10, {}, [
    NEW_OBJECT,
    detector("hand", "tiles"),
  ]),
  makeType(
    { nameKey: "typeNames.1" },
    10,
    {
      placement: "top",
      cameraHeight: "2.6",
      planeHeight: "1.1",
      zoneDepth: "0.8",
      zoneWidth: "1.4",
      analyticsFps: "2",
      fps: "10",
    },
    [detector("nutM8", "tiles")],
  ),
];
