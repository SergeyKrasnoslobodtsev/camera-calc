import { readFields, result, type ParseResult } from "./parse-result.ts";

export type Codec = "h264" | "h265";
export type GpuArch = "Turing" | "Hopper" | "Ampere" | "Ada" | "Blackwell";

// декодер задаётся числом NVDEC или замером потоков 1080p@30 (Jetson)
type Decoder =
  | { nvdec: number; decodeStreams?: undefined }
  | { decodeStreams: Record<Codec, number>; nvdec?: undefined };

export type Gpu = Decoder & {
  id: string;
  name: string;
  arch: GpuArch;
  tflops: number; // FP16 Tensor dense, TFLOPS
  memoryGB: number;
  tdpW: number;
  price: number; // ориентир, $
  jetson?: true;
  custom?: true;
};

const ARCHS: readonly GpuArch[] = [
  "Turing",
  "Hopper",
  "Ampere",
  "Ada",
  "Blackwell",
];

// Своя карта: имя, архитектура, TFLOPS, память и цена обязательны, TDP — 0, если неизвестен.
// Jetson задаёт декодер потоками 1080p@30, остальные — числом NVDEC.
export function parseGpu(raw: unknown): ParseResult<Gpu> {
  const read = readFields(raw);
  const jetson = read.record.jetson === true;
  const streams = read.record.decodeStreams as
    Record<string, unknown> | undefined;
  // поля читаются в порядке формы, чтобы в том же порядке шли ошибки
  const gpu: Gpu = {
    id: read.text("id"),
    name: read.text("name"),
    arch: read.oneOf("arch", ARCHS),
    tflops: read.positive("tflops"),
    ...(jetson
      ? {
          decodeStreams: {
            h264: read.positive("decodeStreams.h264", streams?.h264),
            h265: read.positive("decodeStreams.h265", streams?.h265),
          },
        }
      : { nvdec: read.positive("nvdec") }),
    memoryGB: read.positive("memoryGB"),
    tdpW: read.nonNegative("tdpW"),
    price: read.positive("price"),
  };
  if (jetson) gpu.jetson = true;
  if (read.record.custom === true) gpu.custom = true;
  return result(read.errors, gpu);
}
