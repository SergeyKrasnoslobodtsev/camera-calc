import { readFields, result, type ParseResult } from "./parse-result.ts";

// Модель из каталога Ultralytics: замеры на T4 при входе 640
export type CatalogModel = {
  id: string;
  name: string;
  gflops: number; // на кадр
  latencyMs: number; // T4 TensorRT FP16, batch 1
};

// Своя модель: замер пользователя на одном GPU
export type CustomModel = {
  id: string;
  name: string;
  fps: number; // кадр/с на refGpu
  inputSize: number; // px
  refGpu: string; // id GPU замера
  gflops: number; // 0 — неизвестно
  custom: true;
};

// Своя модель: имя, замер кадров в секунду, вход и GPU замера обязательны, GFLOPs 0 — неизвестно
export function parseModel(raw: unknown): ParseResult<CustomModel> {
  const read = readFields(raw);
  const customModel: CustomModel = {
    id: read.text("id"),
    name: read.text("name"),
    fps: read.positive("fps"),
    inputSize: read.positive("inputSize"),
    refGpu: read.text("refGpu"),
    gflops: read.nonNegative("gflops"),
    custom: true,
  };
  return result(read.errors, customModel);
}
