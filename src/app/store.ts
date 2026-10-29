// Состояние приложения: одно на страницу, меняется только действиями из этого файла.
// После действия результаты пересчитываются через domain, и подписчики получают уведомление.
import { computeType, type TypeResult } from "../domain/compute-type/index.ts";
import {
  computeSystem,
  systemTotals,
  type SystemResult,
  type SystemTotals,
} from "../domain/compute-system/index.ts";
import type { Camera } from "../domain/entities/camera.ts";
import {
  parseCameraType,
  type CameraTypeInputs,
} from "../domain/entities/camera-type.ts";
import type { CustomDetector } from "../domain/entities/detector.ts";
import type { Gpu } from "../domain/entities/gpu.ts";
import { parseSystemSettings } from "../domain/entities/system-settings.ts";
import { parseNum } from "../domain/parse-num.ts";
import { BUILTIN_CAMERAS } from "../domain/references/builtin-cameras.ts";
import { GPU_CATALOG } from "../domain/references/gpu-catalog.ts";
import { MODELS } from "../domain/references/models.ts";
import { DEFAULT_SYSTEM, exampleTypes, makeType, uid } from "./examples.ts";

// Черновики хранят значения полей формы как введены: строки из полей или числа из шаблона.
// Встроенное название задаёт nameKey (ключ словаря), своё — name; изменённое название убирает nameKey.
type DraftNumber = string | number;
export type ObjectDraft = {
  name: string;
  nameKey?: string;
  width: DraftNumber; // см
  length: DraftNumber;
  height: DraftNumber;
  requiredPx: DraftNumber;
  model: string;
  feed: string;
  inputSize: DraftNumber;
  overlap: DraftNumber;
};
export type TypeDraft = {
  id: string;
  name: string;
  nameKey?: string;
  count: DraftNumber;
  inputs: Record<keyof CameraTypeInputs, string>;
  objects: ObjectDraft[];
};
export type SystemDraft = Record<
  "efficiency" | "reserve" | "archiveDays" | "gpu" | "gpuCount",
  string
>;

export type State = {
  cameraTypes: TypeDraft[];
  activeTypeId: string;
  customGpus: Gpu[];
  gpuPrices: Record<string, string>; // правки цен по id GPU, как введены
  gpuEnabled: Record<string, boolean>; // участие в подборе по id GPU, нет записи — участвует
  customCameras: Camera[];
  customDetectors: CustomDetector[];
  system: SystemDraft;
  light: boolean; // светлая тема
};

// Тип, черновик которого не прошёл разбор: расчёта нет, камеры считаются, если их число допустимо
export type DraftError = { ok: false; type: TypeDraft; count: number };
export type TypeOutcome = TypeResult | DraftError;
// system — null, если в параметрах системы или в цене карты ошибка: подбор GPU не выполнен
export type Computed = {
  results: TypeOutcome[]; // по типам камер, в порядке state.cameraTypes
  system: SystemResult | null;
  totals: SystemTotals;
};

const examples = exampleTypes();
export const state: State = {
  cameraTypes: examples,
  activeTypeId: examples[0].id,
  customGpus: [],
  gpuPrices: {},
  gpuEnabled: {},
  customCameras: [],
  customDetectors: [],
  system: { ...DEFAULT_SYSTEM },
  light: false,
};

// ---------- выборки
export const allGpus = (): Gpu[] => [...GPU_CATALOG, ...state.customGpus];
export const gpuById = (id: string) => allGpus().find((gpu) => gpu.id === id);
// правка цены из поля; недопустимая — NaN, подбор GPU показывает ошибку
export const priceOf = (gpu: Gpu) =>
  gpu.id in state.gpuPrices ? parseNum(state.gpuPrices[gpu.id]) : gpu.price;
export const isOn = (gpu: Gpu) => state.gpuEnabled[gpu.id] !== false;
export const allCameras = (): Camera[] => [
  ...BUILTIN_CAMERAS,
  ...state.customCameras,
];
export const cameraById = (id: string) =>
  allCameras().find((camera) => camera.id === id);
export const modelById = (id: string) =>
  MODELS.find((model) => model.id === id) ||
  state.customDetectors.find((detector) => detector.id === id);
export const activeType = () =>
  state.cameraTypes.find((type) => type.id === state.activeTypeId) ||
  state.cameraTypes[0];

// ---------- пересчёт и подписка
function compute(): Computed {
  // черновик с недопустимым числом — ошибка ввода; камеры типа считаются, если их число допустимо
  const results = state.cameraTypes.map((type): TypeOutcome => {
    const parsed = parseCameraType(type);
    if (parsed.ok)
      return computeType(parsed.value, cameraById(type.inputs.camera));
    const countOk = !parsed.errors.some((error) => error.field === "count");
    return { ok: false, type, count: countOk ? parseNum(type.count) : 0 };
  });
  const settings = parseSystemSettings(state.system);
  const gpus = allGpus().map((gpu) => ({ ...gpu, price: priceOf(gpu) }));
  const system =
    settings.ok && gpus.every((gpu) => gpu.price > 0)
      ? computeSystem(
          results.filter((result): result is TypeResult => result.ok),
          settings.value,
          {
            gpus,
            candidates: gpus.filter(isOn),
            detectors: state.customDetectors,
          },
        )
      : null;
  // архив при ошибке в параметрах не считается: NaN суток — ошибка в строке архива
  const totals = systemTotals(
    results,
    settings.ok ? settings.value : { archiveDays: NaN },
    allCameras(),
  );
  return { results, system, totals };
}

export let computed = compute();
export const activeResult = () =>
  computed.results[state.cameraTypes.indexOf(activeType())];
const listeners: (() => void)[] = [];
export const subscribe = (listener: () => void) => listeners.push(listener);
function commit() {
  computed = compute();
  listeners.forEach((listener) => listener());
}

// ---------- действия: типы камер
export function selectType(id: string) {
  if (state.activeTypeId === id) return;
  state.activeTypeId = id;
  commit();
}
export function addType(name: string, objects: readonly ObjectDraft[]) {
  const type = makeType({ name }, 1, {}, objects);
  state.cameraTypes.push(type);
  state.activeTypeId = type.id;
  commit();
}
// копия активного типа сразу после него; name — название копии
export function duplicateActiveType(name: string) {
  const source = activeType();
  const copy: TypeDraft = {
    ...JSON.parse(JSON.stringify(source)),
    id: uid(),
    name,
  };
  delete copy.nameKey;
  state.cameraTypes.splice(state.cameraTypes.indexOf(source) + 1, 0, copy);
  state.activeTypeId = copy.id;
  commit();
}
// последний тип не удаляется; активным становится предыдущий
export function deleteActiveType() {
  if (state.cameraTypes.length < 2) return;
  const index = state.cameraTypes.indexOf(activeType());
  state.cameraTypes.splice(index, 1);
  state.activeTypeId = state.cameraTypes[Math.max(0, index - 1)].id;
  commit();
}
// поля формы типа; name передаётся, только если пользователь изменил название
export function updateActiveType(fields: {
  name?: string;
  count: string;
  inputs: TypeDraft["inputs"];
}) {
  const type = activeType();
  if (fields.name !== undefined) {
    type.name = fields.name;
    delete type.nameKey;
  }
  type.count = fields.count;
  type.inputs = fields.inputs;
  commit();
}

// ---------- действия: объекты активного типа
export function addObject(object: ObjectDraft) {
  activeType().objects.push({ ...object });
  commit();
}
export function updateObject(
  index: number,
  field: Exclude<keyof ObjectDraft, "nameKey">,
  value: string,
) {
  const object = activeType().objects[index];
  object[field] = value;
  if (field === "name") delete object.nameKey;
  commit();
}
export function deleteObject(index: number) {
  activeType().objects.splice(index, 1);
  commit();
}

// ---------- действия: шаблоны
export function setGpuPrice(id: string, value: string) {
  state.gpuPrices[id] = value;
  commit();
}
export function setGpuEnabled(id: string, enabled: boolean) {
  state.gpuEnabled[id] = enabled;
  commit();
}
export function addGpu(gpu: Gpu, enabled: boolean) {
  state.customGpus.push(gpu);
  state.gpuEnabled[gpu.id] = enabled;
  commit();
}
// детекторы, замеренные на удалённой карте, переходят на RTX 5090; выбор карты — на «авто»
export function deleteGpu(id: string) {
  state.customGpus = state.customGpus.filter((gpu) => gpu.id !== id);
  delete state.gpuPrices[id];
  delete state.gpuEnabled[id];
  state.customDetectors.forEach((detector) => {
    if (detector.refGpu === id) detector.refGpu = "5090";
  });
  if (state.system.gpu === id) state.system.gpu = "auto";
  commit();
}
export function addCamera(camera: Camera) {
  state.customCameras.push(camera);
  commit();
}
// типы с удалённой камерой переходят на ручную настройку матрицы
export function deleteCamera(id: string) {
  state.customCameras = state.customCameras.filter(
    (camera) => camera.id !== id,
  );
  state.cameraTypes.forEach((type) => {
    if (type.inputs.camera === id) type.inputs.camera = "";
  });
  commit();
}
export function addDetector(detector: CustomDetector) {
  state.customDetectors.push(detector);
  commit();
}
// объекты с удалённым детектором переходят на YOLO26s
export function deleteDetector(id: string) {
  state.customDetectors = state.customDetectors.filter(
    (detector) => detector.id !== id,
  );
  state.cameraTypes.forEach((type) =>
    type.objects.forEach((object) => {
      if (object.model === id) object.model = "y26s";
    }),
  );
  commit();
}

// ---------- действия: система, тема, пример, загрузка
export function updateSystem(field: keyof SystemDraft, value: string) {
  state.system[field] = value;
  commit();
}
export function toggleTheme() {
  state.light = !state.light;
  commit();
}
// пример вместо типов, параметры системы и правки GPU по умолчанию; свои шаблоны остаются
export function resetToExample() {
  state.cameraTypes = exampleTypes();
  state.activeTypeId = state.cameraTypes[0].id;
  state.system = { ...DEFAULT_SYSTEM };
  state.gpuPrices = {};
  state.gpuEnabled = {};
  commit();
}
// загруженное сохранение: части, которых в нём нет, остаются как были
export function restore(saved: Partial<State>) {
  Object.assign(state, saved);
  commit();
}
