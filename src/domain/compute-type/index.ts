// Расчёт одного типа камер. Обозначения из формул (src/formulas.html):
//   H — высота камеры, h — высота плоскости объектов, Hc = H − h — высота камеры над плоскостью, м;
//   x1 и x2 — края зоны по полу от точки под камерой, м; Nw × Nh — разрешение кадра, px;
//   s — ширина матрицы, мм; f — фокусное расстояние, мм; fpx — оно же в пикселях;
//   k — доля разрешения, которая доходит до модели.
import { DEG } from "../angles.ts";
import type { Camera } from "../entities/camera.ts";
import type { CameraType, Placement } from "../entities/camera-type.ts";
import { parseNum } from "../parse-num.ts";
import { resolveFrame, type Frame } from "./frame.ts";
import { fitLens, frameWidthAt, type LensFit } from "./lens.ts";
import {
  densityProfile,
  zoneRoiPx,
  type DensityProfile,
} from "./projection.ts";
import { runGroups, type RunGroup } from "./run-groups.ts";
import {
  evaluateObject,
  type ObjectResult,
  type ObjectStatus,
} from "./scene-object.ts";
import { describeStream, shutterDenominator, type Stream } from "./stream.ts";
import {
  assessObjects,
  isClamped,
  sceneNotes,
  type Note,
  type Verdict,
} from "./verdict.ts";
import { depthAt, zoneGeometry, type Zone } from "./zone.ts";

export type { Feed } from "./feed.ts";
export type { Note, Verdict } from "./verdict.ts";
export type { ObjectResult, ObjectStatus, RunGroup };
export type { ValidObject } from "./scene-object.ts";

// Геометрия: исходные размеры, м, и зона; frameWidthNear и frameWidthFar — ширина кадра
// на глубине ближнего и дальнего края зоны, м.
export type Geometry = Zone & {
  H: number;
  h: number;
  Hc: number;
  zoneStart: number;
  zoneDepth: number;
  zoneWidth: number;
  frameWidthNear: number;
  frameWidthFar: number;
};

// Ошибка ввода: геометрия или матрица не позволяют построить кадр
export type InputError = {
  ok: false;
  type: CameraType;
  count: number;
  frame: Frame;
};

export type TypeResult =
  | InputError
  | {
      ok: true;
      type: CameraType;
      count: number; // камер этого типа
      frame: Frame;
      placement: Placement;
      geometry: Geometry;
      lens: LensFit & {
        mode: CameraType["inputs"]["lensMode"];
        clamped: boolean;
      };
      density: DensityProfile;
      stream: Stream;
      shutterDenominator: number; // выдержка не длиннее 1 / shutterDenominator с
      objects: ObjectResult[];
      verdict: Verdict;
      status: ObjectStatus;
      notes: Note[];
      runGroups: RunGroup[];
    };

// camera — камера из шаблона, которую выбрал тип камер; без неё кадр и матрица берутся из полей
export function computeType(
  type: CameraType,
  camera: Camera | undefined,
): TypeResult {
  const { inputs } = type;
  const count = Math.max(0, Math.round(parseNum(type.count)) || 0);
  const frame = resolveFrame(inputs, camera);
  const H = parseNum(inputs.cameraHeight),
    h = parseNum(inputs.planeHeight),
    zoneStart = parseNum(inputs.zoneStart),
    zoneDepth = parseNum(inputs.zoneDepth),
    zoneWidth = parseNum(inputs.zoneWidth),
    k = parseNum(inputs.lensFactor);
  const Hc = H - h;
  const error: InputError = { ok: false, type, count, frame };
  if (
    ![H, h, zoneDepth, zoneWidth, frame.sensorWidth, k].every(isFinite) ||
    (inputs.placement === "side" && !isFinite(zoneStart)) ||
    Hc <= 0 ||
    zoneDepth <= 0 ||
    zoneWidth <= 0 ||
    !(frame.sensorWidth > 0)
  )
    return error;

  const zone = zoneGeometry(inputs.placement, Hc, zoneStart, zoneDepth);
  const focalRange =
    camera && camera.focalMin > 0
      ? { min: camera.focalMin, max: camera.focalMax }
      : null;
  const lens = fitLens(
    frame,
    zone,
    {
      mode: inputs.lensMode,
      focalLength: parseNum(inputs.focalLength),
      hfov: parseNum(inputs.hfov) * DEG,
      margin: (parseNum(inputs.margin) || 0) / 100,
      zoneWidth,
      focalRange,
    },
    inputs.orientation,
  );
  if (!isFinite(lens.fpx) || lens.fpx <= 0) return error;

  const view = { Hc, tilt: zone.tilt, fpx: lens.fpx };
  const fittedFrame = { width: lens.frameWidthPx, height: lens.frameHeightPx };
  const objectContext = {
    view,
    k,
    zone,
    frameWidth: frame.width,
    frame: fittedFrame,
    roi: zoneRoiPx(view, zone, zoneWidth, fittedFrame),
  };
  const objects = type.objects.map((object) =>
    evaluateObject(object, objectContext),
  );
  const stream = describeStream({
    count,
    frameWidthPx: lens.frameWidthPx,
    frameHeightPx: lens.frameHeightPx,
    fps: parseNum(inputs.fps),
    analyticsFpsSet: parseNum(inputs.analyticsFps),
    bitsPerPixel: +inputs.codec,
    sceneFactor: +inputs.scene,
  });
  const clamped = isClamped(lens);
  const assessment = assessObjects(
    objects,
    sceneNotes({
      lens,
      clamped,
      manualLens: inputs.lensMode !== "auto",
      focalRange,
      zone,
      zoneWidth,
      Hc,
      analyticsFpsSet: stream.analyticsFpsSet,
      fps: stream.fps,
    }),
  );
  const density = densityProfile(view, zone);
  return {
    ok: true,
    type,
    count,
    frame,
    placement: inputs.placement,
    geometry: {
      H,
      h,
      Hc,
      zoneStart,
      zoneDepth,
      zoneWidth,
      ...zone,
      frameWidthNear: frameWidthAt(lens.hfov, depthAt(Hc, zone.tilt, zone.x1)),
      frameWidthFar: frameWidthAt(lens.hfov, depthAt(Hc, zone.tilt, zone.x2)),
    },
    lens: { ...lens, mode: inputs.lensMode, clamped },
    density,
    stream,
    shutterDenominator: shutterDenominator(
      parseNum(inputs.speed),
      density.max,
      parseNum(inputs.blurPx),
    ),
    objects,
    ...assessment,
    runGroups: runGroups(objects, count, stream.analyticsFps),
  };
}
