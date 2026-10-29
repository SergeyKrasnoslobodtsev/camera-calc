import type { Codec, Gpu, GpuArch } from "../entities/gpu.ts";

// tflops — FP16 Tensor dense, TFLOPS (GeForce — с FP32-накоплением). price — ориентир, $, октябрь 2026
export const GPU_CATALOG: readonly Gpu[] = [
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

// 1080p к/с на один NVDEC (NVIDIA Video Codec SDK 13.0, NVDEC Application Note); Hopper = Turing
const NVDEC_FPS: Record<GpuArch, Record<Codec, number>> = {
  Turing: { h264: 771, h265: 1316 },
  Hopper: { h264: 771, h265: 1316 },
  Ampere: { h264: 748, h265: 1415 },
  Ada: { h264: 903, h265: 1641 },
  Blackwell: { h264: 2172, h265: 1872 },
};
// частота опорного потока 1080p, в котором считается ёмкость декодера, кадр/с
const REFERENCE_STREAM_FPS = 30;

// потоков 1080p@30, которые GPU декодирует: замер для Jetson, иначе по числу NVDEC
export const decodableStreams = (gpu: Gpu, codec: Codec) =>
  gpu.decodeStreams
    ? gpu.decodeStreams[codec]
    : (gpu.nvdec * NVDEC_FPS[gpu.arch][codec]) / REFERENCE_STREAM_FPS;
