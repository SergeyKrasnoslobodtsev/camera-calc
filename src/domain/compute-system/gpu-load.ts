import type { TypeResult } from "../compute-type/index.ts";
import type { RunGroup } from "../compute-type/run-groups.ts";
import type { CustomDetector } from "../entities/detector.ts";
import type { Gpu } from "../entities/gpu.ts";
import { decodableStreams } from "../references/gpu-catalog.ts";
import { MODELS, T4_TFLOPS } from "../references/models.ts";

// вход, при котором сняты задержки моделей каталога, px (docs.ultralytics.com)
const CATALOG_INPUT_PX = 640;
// Видеопамять, ГБ. Значения без источника, см. decisions/domain.md.
const BASE_MEMORY_GB = 0.8; // среда выполнения
const ENGINE_BASE_GB = 0.15; // движок TensorRT без активаций
const UNKNOWN_ENGINE_GB = 0.5; // движок модели с неизвестными GFLOPs
const BATCH_SIZE = 16;
const BYTES_PER_INPUT_PIXEL = 6; // 3 канала FP16
const ENGINE_GFLOPS_DIVISOR = 4; // активации растут как GFLOPs / 4
const FRAMES_PER_STREAM = 20; // декодированных кадров одного потока в памяти
const MEMORY_USABLE_SHARE = 0.9;
const JETSON_MEMORY_USABLE_SHARE = 0.6; // у Jetson память общая с CPU

export type LiveResult = Extract<TypeResult, { ok: true }>;

// Запуск модели в системе: группа запусков и название типа камер, из которого она пришла
export type SystemRunGroup = RunGroup & { typeName: string };

// Запуск на варианте GPU: capacity — кадров в секунду на входе модели с учётом
// эффективности, gpusNeeded — сколько GPU занимает запуск
export type RunLoad = SystemRunGroup &
  (
    | { unknownModel: true }
    | { unknownModel?: undefined; capacity: number; gpusNeeded: number }
  );

export type Bottleneck = "inference" | "decoder" | "memory";

// Вариант: count карт gpu. Загрузка (load) — доля ресурса GPU, 1 = 100%;
// inferenceGpus и decodeGpus — сколько таких GPU нужно инференсу и декодеру.
export type GpuOption = {
  gpu: Gpu;
  count: number;
  runs: RunLoad[];
  inferenceGpus: number;
  decodeGpus: number;
  inferenceLoad: number;
  decodeLoad: number;
  memoryLoad: number;
  memoryUseGB: number;
  memoryCapGB: number;
  worstLoad: number;
  ok: boolean;
  cost: number;
  bottleneck: Bottleneck;
};

// Нагрузка системы, общая для всех вариантов GPU. engines — модели с конкретным входом:
// в памяти GPU каждый движок один раз. gpus — для GPU замера своего детектора, первый — запасной.
export type SystemDemand = {
  liveResults: LiveResult[];
  groups: SystemRunGroup[];
  engines: SystemRunGroup[];
  efficiency: number;
  maxLoad: number;
  gpus: readonly Gpu[];
  detectors: readonly CustomDetector[];
};

// кадров в секунду на входе inputSize: модель каталога — по замеру на T4,
// свой детектор — по замеру пользователя на его GPU
function modelFps(
  demand: SystemDemand,
  modelId: string,
  inputSize: number,
  gpu: Gpu,
) {
  const catalogModel = MODELS.find((model) => model.id === modelId);
  if (catalogModel) {
    const inputScale = (CATALOG_INPUT_PX / inputSize) ** 2;
    return (
      ((1000 / catalogModel.latencyMs) * inputScale * gpu.tflops) / T4_TFLOPS
    );
  }
  const detector = demand.detectors.find((item) => item.id === modelId);
  if (!detector) return undefined;
  const refGpu =
      demand.gpus.find((item) => item.id === detector.refGpu) || demand.gpus[0],
    inputScale = (detector.inputSize / inputSize) ** 2;
  return (detector.fps * inputScale * gpu.tflops) / refGpu.tflops;
}

function engineMemoryGB(demand: SystemDemand, engine: SystemRunGroup) {
  const model =
    MODELS.find((item) => item.id === engine.model) ||
    demand.detectors.find((item) => item.id === engine.model);
  const gflops = model && model.gflops > 0 ? model.gflops : 0;
  return gflops
    ? ENGINE_BASE_GB +
        (BATCH_SIZE *
          engine.feed.inputSize ** 2 *
          BYTES_PER_INPUT_PIXEL *
          (gflops / ENGINE_GFLOPS_DIVISOR)) /
          1e9
    : UNKNOWN_ENGINE_GB;
}

export function evaluateGpu(
  demand: SystemDemand,
  gpu: Gpu,
  count: number,
): GpuOption {
  const { liveResults, efficiency, maxLoad } = demand;
  const runs = demand.groups.map((group): RunLoad => {
    const framesPerSecond = modelFps(
      demand,
      group.model,
      group.feed.inputSize,
      gpu,
    );
    if (framesPerSecond === undefined) return { ...group, unknownModel: true };
    const capacity = framesPerSecond * efficiency;
    return { ...group, capacity, gpusNeeded: group.load / capacity };
  });
  const inferenceGpus = runs.reduce(
    (sum, run) => (run.unknownModel ? sum : sum + run.gpusNeeded),
    0,
  );
  const decodeGpus = liveResults.reduce(
    (sum, result) =>
      sum +
      result.stream.decodeUnits /
        (decodableStreams(gpu, result.stream.codec) * efficiency),
    0,
  );
  const memoryUseGB =
      BASE_MEMORY_GB +
      demand.engines.reduce(
        (sum, engine) => sum + engineMemoryGB(demand, engine),
        0,
      ) +
      liveResults.reduce(
        (sum, result) =>
          sum +
          Math.ceil(result.count / count) *
            FRAMES_PER_STREAM *
            result.stream.frameGB,
        0,
      ),
    memoryCapGB =
      gpu.memoryGB *
      (gpu.jetson ? JETSON_MEMORY_USABLE_SHARE : MEMORY_USABLE_SHARE);
  const inferenceLoad = inferenceGpus / count,
    decodeLoad = decodeGpus / count,
    memoryLoad = memoryUseGB / memoryCapGB;
  return {
    gpu,
    count,
    runs,
    inferenceGpus,
    decodeGpus,
    inferenceLoad,
    decodeLoad,
    memoryLoad,
    memoryUseGB,
    memoryCapGB,
    worstLoad: Math.max(inferenceLoad, decodeLoad, memoryLoad),
    ok: inferenceLoad <= maxLoad && decodeLoad <= maxLoad && memoryLoad <= 1,
    cost: count * gpu.price,
    bottleneck:
      inferenceLoad >= decodeLoad && inferenceLoad >= memoryLoad
        ? "inference"
        : decodeLoad >= memoryLoad
          ? "decoder"
          : "memory",
  };
}
