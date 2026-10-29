// Сохранение в localStorage, загрузка, импорт и экспорт. Записи проходят через функции разбора из domain:
// загрузка пропускает записи, которые не прошли разбор, импорт отклоняет такой файл целиком.
import { parseCamera } from "../domain/entities/camera.ts";
import { parseCameraType } from "../domain/entities/camera-type.ts";
import { parseDetector } from "../domain/entities/detector.ts";
import { parseGpu } from "../domain/entities/gpu.ts";
import {
  onlyValueErrors,
  type ParseResult,
} from "../domain/entities/parse-result.ts";
import { parseSystemSettings } from "../domain/entities/system-settings.ts";
import { GPU_CATALOG } from "../domain/references/gpu-catalog.ts";
import { MODELS } from "../domain/references/models.ts";
import { DEFAULT_INPUTS, DEFAULT_SYSTEM, uid } from "./examples.ts";
import type { State, SystemDraft, TypeDraft } from "./store.ts";

const STORAGE_KEY = "camcalc4";
// варианты поля «Количество GPU» в разметке
const GPU_COUNT_CHOICES = ["auto", "1", "2", "3", "4"];

// сохранение и файл экспорта
const snapshot = (state: State) => ({
  types: state.cameraTypes,
  activeTypeId: state.activeTypeId,
  system: state.system,
  gpuPrices: state.gpuPrices,
  gpuEnabled: state.gpuEnabled,
  customGpus: state.customGpus,
  customCameras: state.customCameras,
  customDetectors: state.customDetectors,
  light: state.light,
});
export const exportText = (state: State) =>
  JSON.stringify(snapshot(state), null, 1);

// данные изменили в другой вкладке: сохранение отсюда их бы затёрло
let stale = false;
export function watchOtherTabs(onStale: () => void) {
  addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      stale = true;
      onStale();
    }
  });
}
// false — не сохранено, потому что данные изменили в другой вкладке
export function save(state: State) {
  if (stale) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot(state)));
  } catch {}
  return true;
}

// старые сохранения: числа с десятичной запятой → нейтральный вид 1.5
const withDot = (value: unknown) =>
  typeof value === "string" ? value.replace(",", ".") : value;
// значения из сохранения не проверены: их проверит разбор или расчёт
const allWithDot = (values: object): Record<string, any> =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, withDot(value)]),
  );
const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null;

// Тип из сохранения или файла: недостающие поля — по умолчанию.
// Не объект остаётся как есть, его отклонит разбор.
const savedObject = (object: unknown) =>
  isObject(object)
    ? {
        name: object.name,
        nameKey: object.nameKey,
        width: withDot(object.width),
        length: withDot(object.length),
        height: withDot(object.height),
        requiredPx: withDot(object.requiredPx),
        model: object.model,
        feed: object.feed,
        inputSize: object.inputSize,
        overlap: withDot(object.overlap ?? 20),
      }
    : object;
const savedType = (type: unknown) =>
  isObject(type)
    ? {
        id: type.id || uid(),
        name: type.name,
        nameKey: type.nameKey,
        count: withDot(type.count),
        inputs: allWithDot({ ...DEFAULT_INPUTS, ...type.inputs }),
        objects: Array.isArray(type.objects)
          ? type.objects.map(savedObject)
          : (type.objects ?? []),
      }
    : type;
// параметры системы, которых нет в сохранении, — по умолчанию
const savedSystem = (system: unknown) =>
  isObject(system)
    ? Object.fromEntries(
        Object.entries(DEFAULT_SYSTEM).map(([field, value]) => [
          field,
          withDot(system[field] ?? value),
        ]),
      )
    : system;

// записи сохранения или файла импорта, которые прошли разбор; rejected — сколько записей не прошли
function parseSaved(saved: Record<string, any>) {
  let rejected = 0;
  const parseAll = <T>(
    items: unknown[],
    parse: (item: unknown) => ParseResult<T>,
  ) =>
    items.flatMap((item) => {
      const parsed = parse(item);
      if (parsed.ok) return [parsed.value];
      rejected++;
      return [];
    });
  // тип камер и параметры системы хранятся черновиком: разбор решает, принять ли запись;
  // недопустимое число черновик не отклоняет, его покажет расчёт
  const asDraft =
    <T>(parse: (item: unknown) => ParseResult<unknown>) =>
    (item: unknown): ParseResult<T> => {
      const parsed = parse(item);
      return parsed.ok || onlyValueErrors(parsed.errors)
        ? { ok: true, value: item as T }
        : parsed;
    };
  const list = (items: unknown) => (Array.isArray(items) ? items : []);
  // параметры системы — одна запись, если она есть
  const [system] = parseAll(
    saved.system == null ? [] : [savedSystem(saved.system)],
    asDraft<SystemDraft>(parseSystemSettings),
  );
  return {
    customGpus: parseAll(list(saved.customGpus), parseGpu),
    customCameras: parseAll(list(saved.customCameras), parseCamera),
    customDetectors: parseAll(list(saved.customDetectors), parseDetector),
    types: parseAll(
      list(saved.types).map(savedType),
      asDraft<TypeDraft>(parseCameraType),
    ),
    system,
    rejected, // после всех parseAll выше
  };
}

// Сохранение из localStorage: части, которых в нём нет или которые не прошли разбор, не возвращаются.
// Ссылки на то, чего нет (модель объекта, карта, число карт не из списка), заменяются значением по умолчанию.
export function loadSaved(): Partial<State> {
  const loaded: Partial<State> = {};
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!isObject(saved)) return loaded;
    const parsed = parseSaved(saved);
    if (Array.isArray(saved.customGpus))
      loaded.customGpus = parsed.customGpus.map((gpu) => ({
        ...gpu,
        custom: true,
      }));
    if (Array.isArray(saved.customCameras))
      loaded.customCameras = parsed.customCameras.map((camera) => ({
        ...camera,
        custom: true,
      }));
    if (Array.isArray(saved.customDetectors))
      loaded.customDetectors = parsed.customDetectors;
    if (isObject(saved.gpuPrices))
      loaded.gpuPrices = allWithDot(saved.gpuPrices);
    if (isObject(saved.gpuEnabled)) loaded.gpuEnabled = saved.gpuEnabled;
    if (saved.light) loaded.light = true;
    if (parsed.types.length) {
      const models = [...MODELS, ...(loaded.customDetectors ?? [])];
      parsed.types.forEach((type) =>
        type.objects.forEach((object) => {
          if (!models.some((model) => model.id === object.model))
            object.model = "y26s";
        }),
      );
      loaded.cameraTypes = parsed.types;
      loaded.activeTypeId = parsed.types.some(
        (type) => type.id === saved.activeTypeId,
      )
        ? saved.activeTypeId
        : parsed.types[0].id;
    }
    if (parsed.system) {
      const gpus = [...GPU_CATALOG, ...(loaded.customGpus ?? [])];
      const { gpu, gpuCount } = parsed.system;
      loaded.system = {
        ...parsed.system,
        gpu: gpus.some((item) => item.id === gpu) ? gpu : "auto",
        gpuCount: GPU_COUNT_CHOICES.includes(gpuCount) ? gpuCount : "auto",
      };
    }
  } catch {}
  return loaded;
}

// Файл импорта заменяет сохранение целиком. Файл отклоняется, если в нём нет нужных частей
// или хоть одна запись не прошла разбор; тогда сохранение не меняется.
export function importText(text: string): "ok" | "badFile" | "saveFail" {
  let saved;
  try {
    saved = JSON.parse(text);
  } catch {}
  if (
    !isObject(saved) ||
    !Array.isArray(saved.types) ||
    !saved.types.length ||
    !["customGpus", "customCameras", "customDetectors"].every((key) =>
      Array.isArray(saved[key]),
    ) ||
    !isObject(saved.gpuPrices) ||
    !isObject(saved.gpuEnabled) ||
    parseSaved(saved).rejected
  )
    return "badFile";
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    return "saveFail";
  }
  return "ok";
}
