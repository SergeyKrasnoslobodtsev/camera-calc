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
