import { readFields, result, type ParseResult } from "./parse-result.ts";

// Параметры системы: значения полей формы строками, разбираются при расчёте (parseNum)
export type SystemSettings = {
  efficiency: string; // доля паспортной производительности GPU, которая достижима на деле
  reserve: string; // запас по нагрузке инференса и декодера, %
  archiveDays: string; // глубина архива, сут; 0 — без архива
  gpu: string; // "auto" или id GPU
  gpuCount: string; // "auto" или число GPU
};

// Черновик параметров: проверяется только, что значения — строки; числа разбираются при расчёте
export function parseSystemSettings(raw: unknown): ParseResult<SystemSettings> {
  const read = readFields(raw);
  const settings: SystemSettings = {
    efficiency: read.string("efficiency"),
    reserve: read.string("reserve"),
    archiveDays: read.string("archiveDays"),
    gpu: read.string("gpu"),
    gpuCount: read.string("gpuCount"),
  };
  return result(read.errors, settings);
}
