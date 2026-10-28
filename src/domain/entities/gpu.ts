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
