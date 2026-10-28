import type { Codec } from "../entities/gpu.ts";

// бит на пиксель меньше этого — H.265 (в форме 0,04), иначе H.264 (0,07)
const H265_MAX_BITS_PER_PIXEL = 0.055;
// опорный поток декодера — 1080p@30, в нём заданы замеры NVDEC и Jetson
const REFERENCE_PIXEL_RATE = 1920 * 1080 * 30;
// кадр после декодирования в YUV 4:2:0 — 1,5 байта на пиксель
const DECODED_BYTES_PER_PIXEL = 1.5;

// Поток одной камеры: bitrateMbps — битрейт, Мбит/с; decodeUnits — нагрузка всех камер типа
// на декодер в потоках 1080p@30; frameGB — один декодированный кадр в памяти GPU, ГБ.
export type Stream = {
  fps: number;
  analyticsFps: number; // частота для аналитики, не больше частоты потока
  analyticsFpsSet: number; // заданная частота для аналитики
  codec: Codec;
  bitrateMbps: number;
  decodeUnits: number;
  frameGB: number;
};

export function describeStream(params: {
  count: number;
  frameWidthPx: number;
  frameHeightPx: number;
  fps: number;
  analyticsFpsSet: number;
  bitsPerPixel: number;
  sceneFactor: number;
}): Stream {
  const { count, frameWidthPx, frameHeightPx, fps, bitsPerPixel } = params;
  const pixels = frameWidthPx * frameHeightPx;
  return {
    fps,
    analyticsFps: Math.min(params.analyticsFpsSet, fps),
    analyticsFpsSet: params.analyticsFpsSet,
    codec: bitsPerPixel < H265_MAX_BITS_PER_PIXEL ? "h265" : "h264",
    bitrateMbps: (pixels * fps * bitsPerPixel * params.sceneFactor) / 1e6,
    decodeUnits: (count * pixels * fps) / REFERENCE_PIXEL_RATE,
    frameGB: (pixels * DECODED_BYTES_PER_PIXEL) / 1e9,
  };
}

// выдержка не длиннее 1 / shutterDenominator с, чтобы за кадр объект сместился не больше
// чем на blurPx при наибольшей плотности maxDensity, px/м
export const shutterDenominator = (
  speed: number,
  maxDensity: number,
  blurPx: number,
) => (speed * maxDensity) / blurPx;
