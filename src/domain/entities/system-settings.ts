import { parseNum } from "../parse-num.ts";
import { readFields, result, type ParseResult } from "./parse-result.ts";

// Параметры системы. В store и в сохранении хранятся черновиком — значениями полей формы строками.
export type SystemSettings = {
  efficiency: number; // доля паспортной производительности GPU, которая достижима на деле
  reserve: number; // запас по нагрузке инференса и декодера, %, не меньше 0
  archiveDays: number; // глубина архива, сут; 0 — без архива
  gpu: string; // "auto" или id GPU
  gpuCount: "auto" | number; // "auto" или число GPU
};

// Параметры из черновика: значения — строки, числа разбираются; недопустимая доля — NaN.
// Запас и архив без значения — 0, отрицательный запас — 0.
export function parseSystemSettings(raw: unknown): ParseResult<SystemSettings> {
  const read = readFields(raw);
  const gpuCount = read.string("gpuCount");
  const settings: SystemSettings = {
    efficiency: parseNum(read.string("efficiency")),
    reserve: Math.max(0, parseNum(read.string("reserve")) || 0),
    archiveDays: parseNum(read.string("archiveDays")) || 0,
    gpu: read.string("gpu"),
    gpuCount: gpuCount === "auto" ? "auto" : Number(gpuCount),
  };
  return result(read.errors, settings);
}
