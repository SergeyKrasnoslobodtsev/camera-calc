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

// Параметры из черновика: значения — строки, числа разбираются. Доля больше 0, запас не меньше 0,
// архив — целое число суток не меньше 0; пустое значение — ошибка.
export function parseSystemSettings(raw: unknown): ParseResult<SystemSettings> {
  const read = readFields(raw);
  const gpuCount = read.string("gpuCount");
  const archiveDays = read.nonNegative(
    "archiveDays",
    parseNum(read.string("archiveDays")),
  );
  read.integer("archiveDays", archiveDays);
  const settings: SystemSettings = {
    efficiency: read.positive(
      "efficiency",
      parseNum(read.string("efficiency")),
    ),
    reserve: read.nonNegative("reserve", parseNum(read.string("reserve"))),
    archiveDays,
    gpu: read.string("gpu"),
    gpuCount: gpuCount === "auto" ? "auto" : Number(gpuCount),
  };
  return result(read.errors, settings);
}
