import { STR, formatNumber, t } from "../i18n/index.ts";
import { store } from "./store.js";
export const byId = (id) => document.getElementById(id);
export const DEG = Math.PI / 180;
export const escapeHtml = (text) =>
  String(text ?? "").replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );
export const parseNum = (value) =>
  parseFloat(String(value ?? "").replace(",", "."));
export const uid = () => Math.random().toString(36).slice(2, 9);

// ---------- справочники
export const RESOLUTIONS = [
  [2, 1920, 1080],
  [4, 2560, 1440],
  [5, 2592, 1944],
  [5, 2880, 1620],
  [6, 3072, 2048],
  [8, 3840, 2160],
  [12, 4000, 3000],
].map(([mp, width, height]) => [
  `${t("megapixels", mp)} · ${width} × ${height}`,
  width,
  height,
]);
export const SENSORS = [
  ['1/3"', 4.8],
  ['1/2.9"', 5.0],
  ['1/2.8"', 5.6],
  ['1/2.7"', 5.4],
  ['1/2.5"', 5.8],
  ['1/1.8" 16:9', 7.7],
  ['1/1.2" 16:9', 11.2],
  ["pp", "pp"],
  ["own", null],
];
// Каталог: tflops — FP16 Tensor dense, TFLOPS (GeForce — с FP32-накоплением). price — ориентир, $, октябрь 2026
export const GPU_CATALOG = [
  {
    id: "5090",
    name: "GeForce RTX 5090",
    arch: "Blackwell",
    tflops: 209.5,
    nvdec: 2,
    memoryGB: 32,
    tdpW: 575,
    price: 5000,
  },
  {
    id: "pro6000",
    name: "RTX PRO 6000 Blackwell",
    arch: "Blackwell",
    tflops: 500,
    nvdec: 4,
    memoryGB: 96,
    tdpW: 600,
    price: 13250,
  },
  {
    id: "l40s",
    name: "L40S",
    arch: "Ada",
    tflops: 362,
    nvdec: 3,
    memoryGB: 48,
    tdpW: 350,
    price: 9000,
  },
  {
    id: "h100nvl",
    name: "H100 NVL",
    arch: "Hopper",
    tflops: 835.5,
    nvdec: 7,
    memoryGB: 94,
    tdpW: 400,
    price: 27500,
  },
  {
    id: "h200nvl",
    name: "H200 NVL",
    arch: "Hopper",
    tflops: 835.5,
    nvdec: 7,
    memoryGB: 141,
    tdpW: 600,
    price: 32000,
  },
  {
    id: "agx",
    name: "Jetson AGX Orin 64GB",
    arch: "Ampere",
    tflops: 42.6,
    decodeStreams: { h265: 22, h264: 11.6 },
    memoryGB: 64,
    tdpW: 60,
    price: 3499,
    jetson: true,
  },
];
export const allGpus = () => [...GPU_CATALOG, ...store.customGpus];
export const gpuById = (id) => allGpus().find((gpu) => gpu.id === id);
export const priceOf = (gpu) => {
  const price = parseNum(store.gpuPrices[gpu.id]);
  return price > 0 ? price : gpu.price;
};
export const isOn = (gpu) => store.gpuEnabled[gpu.id] !== false;
// 1080p к/с на один NVDEC (NVIDIA Video Codec SDK 13.0, NVDEC Application Note); Hopper = Turing
const NVDEC_FPS = {
  Turing: { h264: 771, h265: 1316 },
  Hopper: { h264: 771, h265: 1316 },
  Ampere: { h264: 748, h265: 1415 },
  Ada: { h264: 903, h265: 1641 },
  Blackwell: { h264: 2172, h265: 1872 },
};
// потоков 1080p@30, которые GPU декодирует: st — замер для Jetson, иначе по числу NVDEC
export const decStreams = (gpu, codec) =>
  gpu.decodeStreams
    ? gpu.decodeStreams[codec]
    : (gpu.nvdec * NVDEC_FPS[gpu.arch][codec]) / 30;
export const decText = (gpu) =>
  gpu.decodeStreams
    ? t("decoderStreams", formatNumber(gpu.decodeStreams.h265, 0))
    : `${gpu.nvdec} NVDEC`;
// Модели: GFLOPs и задержка на T4 TensorRT FP16, batch 1, вход 640 (docs.ultralytics.com)
export const MODELS = [
  ["y26n", "YOLO26n", 5.5, 1.7],
  ["y26s", "YOLO26s", 20.9, 2.5],
  ["y26m", "YOLO26m", 68.4, 4.7],
  ["y26l", "YOLO26l", 86.8, 6.2],
  ["y26x", "YOLO26x", 194.4, 11.8],
  ["y26np", "YOLO26n-pose", 7.6, 1.8],
  ["y26sp", "YOLO26s-pose", 24.1, 2.7],
  ["y26mp", "YOLO26m-pose", 73.3, 5.0],
  ["y26lp", "YOLO26l-pose", 91.7, 6.5],
  ["y26xp", "YOLO26x-pose", 202.3, 12.2],
  ["y11n", "YOLO11n", 6.5, 1.5],
  ["y11s", "YOLO11s", 21.6, 2.5],
  ["y11m", "YOLO11m", 68.1, 4.7],
  ["y11l", "YOLO11l", 87.2, 6.2],
  ["y11x", "YOLO11x", 195.3, 11.3],
].map(([id, name, gflops, latencyMs]) => ({ id, name, gflops, latencyMs }));
export const T4_TFLOPS = 65; // T4: 65 TFLOPS FP16, на ней сняты замеры Ultralytics
export const FEEDS = STR.feeds,
  FEED_SHORT = STR.feedsShort;
export const INPUTS = [320, 416, 512, 640, 768, 960, 1024, 1280];
