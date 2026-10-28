import type { SceneObject } from "../entities/camera-type.ts";
import { describeFeed, type Feed } from "./feed.ts";
import { boxSizePx, ZONE_STEPS, type Size, type View } from "./projection.ts";
import type { Zone } from "./zone.ts";

// «на грани» — от этой доли порога до порога; источник значения не указан
const WARN_SHARE = 0.75;

export type ObjectStatus = "ok" | "warn" | "bad";

// Объект в худшем положении в зоне, где его рамка меньше всего.
// widthPx × heightPx — рамка на матрице, minSidePx — её меньшая сторона, x0 — ближний край, м;
// modelPx — меньшая сторона на входе модели; minSensorWidthPx — ширина кадра, при которой
// на матрице хватило бы пикселей; sensorOk — на матрице порог выполняется.
export type ObjectResult =
  | { valid: false; object: SceneObject; feed: Feed }
  | {
      valid: true;
      object: SceneObject;
      feed: Feed;
      requiredPx: number;
      widthPx: number;
      heightPx: number;
      minSidePx: number;
      x0: number;
      modelPx: number;
      status: ObjectStatus;
      minSensorWidthPx: number;
      sensorOk: boolean;
    };

// объект, для которого размеры найдены
export type ValidObject = Extract<ObjectResult, { valid: true }>;

export type ObjectContext = {
  view: View;
  k: number; // доля разрешения, которая доходит до модели
  zone: Zone;
  frameWidth: number; // ширина кадра до поворота камеры, px
  frame: Size; // кадр с учётом поворота, px
  roi: Size; // зона в кадре, px
};

export function evaluateObject(
  object: SceneObject,
  context: ObjectContext,
): ObjectResult {
  const { view, k, zone } = context;
  // габариты в см → м
  const width = object.width / 100,
    length = object.length / 100,
    height = object.height / 100,
    { requiredPx } = object;
  const feed = describeFeed(
    object.feed,
    object.inputSize,
    object.overlap,
    context.frame,
    context.roi,
  );
  if (
    ![width, length, height].every((size) => isFinite(size) && size >= 0) ||
    Math.max(width, length, height) <= 0 ||
    !(requiredPx > 0)
  )
    return { valid: false, object, feed };
  const travel = Math.max(0, zone.x2 - zone.x1 - length);
  let worst = null;
  for (let i = 0; i <= ZONE_STEPS; i++) {
    const x0 = zone.x1 + (travel * i) / ZONE_STEPS,
      box = boxSizePx(view, k, x0, width, length, height);
    if (!box) continue;
    const minSidePx = Math.min(box.widthPx, box.heightPx);
    if (!worst || minSidePx < worst.minSidePx)
      worst = { ...box, minSidePx, x0 };
  }
  if (!worst) return { valid: false, object, feed };
  const modelPx = worst.minSidePx * feed.modelScale;
  return {
    valid: true,
    object,
    feed,
    requiredPx,
    ...worst,
    modelPx,
    status:
      modelPx >= requiredPx
        ? "ok"
        : modelPx >= WARN_SHARE * requiredPx
          ? "warn"
          : "bad",
    minSensorWidthPx: (context.frameWidth * requiredPx) / worst.minSidePx,
    sensorOk: worst.minSidePx >= requiredPx,
  };
}
