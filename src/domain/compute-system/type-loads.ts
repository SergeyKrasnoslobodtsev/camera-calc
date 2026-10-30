import type { CameraType } from "../entities/camera-type.ts";
import type { GpuOption, RunLoad } from "./gpu-load.ts";

type KnownRun = Extract<RunLoad, { gpusNeeded: number }>;

// Запуск модели в разбивке: share — доля мощности всех карт варианта, 1 = 100%
export type TypeRunLoad = KnownRun & { share: number };

// Нагрузка типа камер на инференс; сумма share по типам равна inferenceLoad варианта
export type TypeLoad = {
  type: CameraType;
  share: number;
  runs: TypeRunLoad[];
};

// типы и их запуски — от большей доли к меньшей; запуски с неизвестной моделью в нагрузку не входят
export function typeLoads(option: GpuOption): TypeLoad[] {
  const loads = new Map<string, TypeLoad>();
  option.runs
    .filter((run): run is KnownRun => !run.unknownModel)
    .forEach((run) => {
      const share = run.gpusNeeded / option.count;
      const load = loads.get(run.type.id);
      if (load) {
        load.share += share;
        load.runs.push({ ...run, share });
      } else
        loads.set(run.type.id, {
          type: run.type,
          share,
          runs: [{ ...run, share }],
        });
    });
  return [...loads.values()]
    .map((load) => ({
      ...load,
      runs: load.runs.sort((a, b) => b.share - a.share),
    }))
    .sort((a, b) => b.share - a.share);
}
