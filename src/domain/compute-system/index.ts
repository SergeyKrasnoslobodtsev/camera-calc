// Подбор GPU для всех типов камер. Варианты — от 1 до 4 карт каждого GPU, включённого в подбор.
import type { TypeResult } from "../compute-type/index.ts";
import type { CustomModel } from "../entities/model.ts";
import type { Gpu } from "../entities/gpu.ts";
import type { SystemSettings } from "../entities/system-settings.ts";
import {
  evaluateGpu,
  type GpuOption,
  type LiveResult,
  type SystemDemand,
} from "./gpu-load.ts";

export type {
  Bottleneck,
  GpuOption,
  LiveResult,
  RunLoad,
  SystemRunGroup,
} from "./gpu-load.ts";
export { systemTotals } from "./totals.ts";
export type { NetworkPort, SystemTotals } from "./totals.ts";

// числа карт в вариантах, как в поле «Количество GPU»
const GPU_COUNTS = [1, 2, 3, 4];

// gpus — каталог и свои карты с действующей ценой, первый — запасной;
// candidates — те из них, что участвуют в подборе; customModels — свои модели
export type SystemCatalog = {
  gpus: readonly Gpu[];
  candidates: readonly Gpu[];
  customModels: readonly CustomModel[];
};

// liveResults — типы без ошибки и с камерами; maxLoad — наибольшая допустимая загрузка
// инференса и декодера; optimum — самый дешёвый подходящий вариант; chosen — вариант
// по выбору GPU и количества в параметрах; decodeUnitsTotal — нагрузка на декодер
// в потоках 1080p@30.
export type SystemResult = {
  liveResults: LiveResult[];
  efficiency: number;
  maxLoad: number;
  chosen: GpuOption;
  optimum: GpuOption | undefined;
  decodeUnitsTotal: number;
  noCandidates: boolean;
};

export function computeSystem(
  results: TypeResult[],
  settings: SystemSettings,
  catalog: SystemCatalog,
): SystemResult {
  const liveResults = results.filter(
    (result): result is LiveResult => result.ok && result.count > 0,
  );
  const { efficiency } = settings,
    maxLoad = 1 / (1 + settings.reserve / 100);
  const groups = liveResults.flatMap((result) =>
    result.runGroups.map((group) => ({ ...group, type: result.type })),
  );
  const engines = [
    ...new Map(
      groups.map((group) => [`${group.model}|${group.feed.inputSize}`, group]),
    ).values(),
  ];
  const demand: SystemDemand = {
    liveResults,
    groups,
    engines,
    efficiency,
    maxLoad,
    gpus: catalog.gpus,
    customModels: catalog.customModels,
  };
  const evaluate = (gpu: Gpu, count: number) => evaluateGpu(demand, gpu, count);
  const evaluations = catalog.candidates.flatMap((gpu) =>
    GPU_COUNTS.map((count) => evaluate(gpu, count)),
  );
  // подходящие варианты от дешёвых к дорогим, при равной цене — по мощности
  const fitting = evaluations
    .filter((option) => option.ok)
    .sort(
      (a, b) => a.cost - b.cost || a.count * a.gpu.tdpW - b.count * b.gpu.tdpW,
    );
  const optimum = fitting[0];
  const leastLoaded = (options: GpuOption[]) =>
    options.length
      ? options.reduce((a, b) => (a.worstLoad < b.worstLoad ? a : b))
      : evaluate(catalog.gpus[0], 1);
  const choose = () => {
    if (settings.gpu === "auto") {
      if (settings.gpuCount === "auto")
        return optimum || leastLoaded(evaluations);
      const count = settings.gpuCount;
      return (
        fitting.find((option) => option.count === count) ||
        leastLoaded(evaluations.filter((option) => option.count === count))
      );
    }
    const gpu =
      catalog.gpus.find((item) => item.id === settings.gpu) || catalog.gpus[0];
    if (settings.gpuCount !== "auto") return evaluate(gpu, settings.gpuCount);
    // наименьшее число карт, которого хватает, иначе наибольшее
    const options = GPU_COUNTS.map((count) => evaluate(gpu, count));
    return options.find((option) => option.ok) || options[options.length - 1];
  };
  return {
    liveResults,
    efficiency,
    maxLoad,
    chosen: choose(),
    optimum,
    decodeUnitsTotal: liveResults.reduce(
      (sum, result) => sum + result.stream.decodeUnits,
      0,
    ),
    noCandidates: !catalog.candidates.length,
  };
}
