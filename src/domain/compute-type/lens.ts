import type { LensMode, Orientation } from "../entities/camera-type.ts";
import type { Frame } from "./frame.ts";
import type { Zone } from "./zone.ts";

// портрет в подборе выбирается, только если даёт заметно больше пикселей; источник порога не указан
const PORTRAIT_MIN_GAIN = 1.02;
// фокус считается упёршимся в предел объектива, если отличается от нужного больше чем на это, мм
const CLAMP_TOLERANCE_MM = 1e-6;

export type FocalRange = { min: number; max: number }; // мм

export type LensRequest = {
  mode: LensMode;
  focalLength: number; // мм, режим "focal"
  hfov: number; // рад, режим "angle"
  margin: number; // запас кадра, доля
  zoneWidth: number; // м
  focalRange: FocalRange | null; // диапазон объектива камеры из шаблона
};

// Объектив и кадр в выбранной ориентации. frameWidthPx × frameHeightPx — кадр с учётом поворота;
// f — фокусное расстояние, мм; fNeeded — нужное для зоны в режиме подбора (до упора в объектив);
// hfov, vfov — углы обзора, рад; fpx — фокусное расстояние в пикселях; fits — зона помещается в кадр.
export type LensFit = {
  rotated: boolean;
  frameWidthPx: number;
  frameHeightPx: number;
  hfov: number;
  f: number;
  fNeeded: number | null;
  vfov: number;
  fpx: number;
  fits: boolean;
};

export function fitLens(
  frame: Frame,
  zone: Zone,
  request: LensRequest,
  orientation: Orientation,
): LensFit {
  if (orientation === "landscape")
    return fitOrientation(frame, zone, request, false);
  if (orientation === "portrait")
    return fitOrientation(frame, zone, request, true);
  const landscape = fitOrientation(frame, zone, request, false),
    portrait = fitOrientation(frame, zone, request, true);
  // подбор: где больше пикселей на метр; заданный объектив: альбомный, если зона в нём помещается
  if (request.mode === "auto")
    return portrait.fpx > landscape.fpx * PORTRAIT_MIN_GAIN
      ? portrait
      : landscape;
  return landscape.fits || !portrait.fits ? landscape : portrait;
}

// rotated — камера повёрнута на 90°: длинная сторона кадра идёт вдоль взгляда
function fitOrientation(
  frame: Frame,
  zone: Zone,
  request: LensRequest,
  rotated: boolean,
): LensFit {
  const { width: Nw, height: Nh, sensorWidth: s } = frame;
  const frameWidthPx = rotated ? Nh : Nw,
    frameHeightPx = rotated ? Nw : Nh,
    sensorWidth = rotated ? (s * Nh) / Nw : s,
    aspect = frameWidthPx / frameHeightPx;
  let hfov: number,
    f: number,
    fNeeded: number | null = null;
  if (request.mode === "auto") {
    const hfovNeeded =
        2 *
        Math.atan(
          (request.zoneWidth * (1 + request.margin)) / 2 / zone.minDepth,
        ),
      vfovNeeded = zone.zoneAngle * (1 + request.margin);
    hfov = Math.max(
      hfovNeeded,
      2 * Math.atan(aspect * Math.tan(vfovNeeded / 2)),
    );
    f = sensorWidth / (2 * Math.tan(hfov / 2));
    fNeeded = f;
    const range = request.focalRange;
    if (range) {
      const fClamped = Math.min(range.max, Math.max(range.min, f));
      if (Math.abs(fClamped - f) > CLAMP_TOLERANCE_MM) {
        f = fClamped;
        hfov = 2 * Math.atan(sensorWidth / (2 * f));
      }
    }
  } else if (request.mode === "focal") {
    f = request.focalLength;
    hfov = 2 * Math.atan(sensorWidth / (2 * f));
  } else {
    hfov = request.hfov;
    f = sensorWidth / (2 * Math.tan(hfov / 2));
  }
  const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect),
    fpx = frameWidthPx / (2 * Math.tan(hfov / 2));
  return {
    rotated,
    frameWidthPx,
    frameHeightPx,
    hfov,
    f,
    fNeeded,
    vfov,
    fpx,
    fits:
      2 * zone.minDepth * Math.tan(hfov / 2) >= request.zoneWidth &&
      vfov >= zone.zoneAngle,
  };
}

// ширина кадра на глубине z по оптической оси, м
export const frameWidthAt = (hfov: number, z: number) =>
  2 * z * Math.tan(hfov / 2);
