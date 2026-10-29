import { readFields, result, type ParseResult } from "./parse-result.ts";

// Модель из каталога Ultralytics: замеры на T4 при входе 640
export type CatalogModel = {
  id: string;
  name: string;
  gflops: number; // на кадр
  latencyMs: number; // T4 TensorRT FP16, batch 1
};

// Свой детектор: замер пользователя на одном GPU
export type CustomDetector = {
  id: string;
  name: string;
  fps: number; // кадр/с на refGpu
  inputSize: number; // px
  refGpu: string; // id GPU замера
  gflops: number; // 0 — неизвестно
  custom: true;
};

// Свой детектор: имя, замер кадров в секунду, вход и GPU замера обязательны, GFLOPs 0 — неизвестно
export function parseDetector(raw: unknown): ParseResult<CustomDetector> {
  const read = readFields(raw);
  const detector: CustomDetector = {
    id: read.text("id"),
    name: read.text("name"),
    fps: read.positive("fps"),
    inputSize: read.positive("inputSize"),
    refGpu: read.text("refGpu"),
    gflops: read.nonNegative("gflops"),
    custom: true,
  };
  return result(read.errors, detector);
}
