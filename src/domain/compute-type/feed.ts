import type { FeedMode } from "../entities/camera-type.ts";
import type { Size } from "./projection.ts";

// перекрытие тайлов не больше этой доли, иначе шаг тайлов стремится к нулю
const MAX_OVERLAP = 0.9;

// Подача кадра в модель: весь кадр (full), вырез зоны (roi) или тайлы (tiles).
// source — что подаётся: кадр или ROI, px; modelScale — уменьшение до входа модели (≤ 1);
// tiles = tilesX × tilesY — число тайлов стороной inputSize, у остальных подач 1.
export type Feed = {
  mode: FeedMode;
  inputSize: number;
  source: Size;
  modelScale: number;
  tiles: number;
  tilesX: number;
  tilesY: number;
};

export function describeFeed(
  mode: FeedMode,
  inputSize: number,
  overlapPercent: number,
  frame: Size,
  roi: Size,
): Feed {
  const source = mode === "full" ? frame : roi;
  if (mode === "full" || mode === "roi")
    return {
      mode,
      inputSize,
      source,
      modelScale: Math.min(
        1,
        inputSize / Math.max(source.width, source.height),
      ),
      tiles: 1,
      tilesX: 1,
      tilesY: 1,
    };
  // тайлы идут с шагом inputSize × (1 − перекрытие) и покрывают ROI без уменьшения
  const overlap = Math.min(MAX_OVERLAP, Math.max(0, overlapPercent / 100)),
    step = inputSize * (1 - overlap);
  const tilesAlong = (length: number) =>
    length > inputSize ? Math.ceil((length - inputSize) / step) + 1 : 1;
  const tilesX = tilesAlong(roi.width),
    tilesY = tilesAlong(roi.height);
  return {
    mode,
    inputSize,
    source,
    modelScale: 1,
    tiles: tilesX * tilesY,
    tilesX,
    tilesY,
  };
}
