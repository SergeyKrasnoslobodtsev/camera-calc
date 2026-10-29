import type { CatalogModel } from "../entities/detector.ts";

// GFLOPs и задержка на T4 TensorRT FP16, batch 1, вход 640 (docs.ultralytics.com)
export const MODELS: readonly CatalogModel[] = [
  { id: "y26n", name: "YOLO26n", gflops: 5.5, latencyMs: 1.7 },
  { id: "y26s", name: "YOLO26s", gflops: 20.9, latencyMs: 2.5 },
  { id: "y26m", name: "YOLO26m", gflops: 68.4, latencyMs: 4.7 },
  { id: "y26l", name: "YOLO26l", gflops: 86.8, latencyMs: 6.2 },
  { id: "y26x", name: "YOLO26x", gflops: 194.4, latencyMs: 11.8 },
  { id: "y26np", name: "YOLO26n-pose", gflops: 7.6, latencyMs: 1.8 },
  { id: "y26sp", name: "YOLO26s-pose", gflops: 24.1, latencyMs: 2.7 },
  { id: "y26mp", name: "YOLO26m-pose", gflops: 73.3, latencyMs: 5.0 },
  { id: "y26lp", name: "YOLO26l-pose", gflops: 91.7, latencyMs: 6.5 },
  { id: "y26xp", name: "YOLO26x-pose", gflops: 202.3, latencyMs: 12.2 },
  { id: "y11n", name: "YOLO11n", gflops: 6.5, latencyMs: 1.5 },
  { id: "y11s", name: "YOLO11s", gflops: 21.6, latencyMs: 2.5 },
  { id: "y11m", name: "YOLO11m", gflops: 68.1, latencyMs: 4.7 },
  { id: "y11l", name: "YOLO11l", gflops: 87.2, latencyMs: 6.2 },
  { id: "y11x", name: "YOLO11x", gflops: 195.3, latencyMs: 11.3 },
];
// T4: 65 TFLOPS FP16, на ней сняты замеры Ultralytics
export const T4_TFLOPS = 65;
