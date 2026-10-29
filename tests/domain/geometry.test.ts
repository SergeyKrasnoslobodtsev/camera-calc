// Кадр, зона, объектив и плотность пикселей на случаях, которые считаются вручную.
import { test } from "vitest";
import assert from "node:assert/strict";
import { DEG } from "../../src/domain/angles.ts";
import { resolveFrame } from "../../src/domain/compute-type/frame.ts";
import {
  fitLens,
  type LensRequest,
} from "../../src/domain/compute-type/lens.ts";
import { densityAt } from "../../src/domain/compute-type/projection.ts";
import { isClamped } from "../../src/domain/compute-type/verdict.ts";
import { zoneGeometry } from "../../src/domain/compute-type/zone.ts";
import type { CameraTypeInputs } from "../../src/domain/entities/camera-type.ts";

const close = (actual: number, expected: number, message?: string) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    message ?? `${actual} ≠ ${expected}`,
  );

const inputs = (changes: Partial<CameraTypeInputs>) =>
  ({
    resolution: 1,
    sensor: 3,
    pixelPitch: 2,
    sensorWidth: 6.1,
    ...changes,
  }) as CameraTypeInputs;

test("кадр: формат матрицы, размер пикселя, своя ширина, камера из шаблона", () => {
  assert.deepEqual(resolveFrame(inputs({}), undefined), {
    width: 2560,
    height: 1440,
    sensorWidth: 5.4,
  });
  // 2 мкм × 2560 px = 5,12 мм
  close(resolveFrame(inputs({ sensor: 7 }), undefined).sensorWidth, 5.12);
  assert.equal(resolveFrame(inputs({ sensor: 8 }), undefined).sensorWidth, 6.1);
  // неизвестные индексы — разрешение и формат по умолчанию
  assert.deepEqual(
    resolveFrame(inputs({ resolution: 99, sensor: 99 }), undefined),
    {
      width: 2560,
      height: 1440,
      sensorWidth: 5.4,
    },
  );
  const camera = {
    id: "c",
    Nw: 3840,
    Nh: 2160,
    sensorWidth: 7.68,
    focalMin: 0,
    focalMax: 0,
  };
  assert.deepEqual(resolveFrame(inputs({}), camera), {
    width: 3840,
    height: 2160,
    sensorWidth: 7.68,
  });
});

test("зона над центром: края симметричны, камера смотрит строго вниз", () => {
  const zone = zoneGeometry("top", 2, 0, 1);
  assert.equal(zone.x1, -0.5);
  assert.equal(zone.x2, 0.5);
  close(zone.tilt, 90 * DEG);
  close(zone.zoneAngle, 2 * Math.atan(0.5 / 2));
  close(zone.minDepth, 2); // оба края на глубине Hc по оси
});

test("зона сбоку: края от выноса, ось в середине угла зоны", () => {
  const zone = zoneGeometry("side", 3, 1, 2);
  assert.deepEqual([zone.x1, zone.x2], [1, 3]);
  close(zone.tilt, (Math.atan2(3, 1) + Math.atan2(3, 3)) / 2);
});

test("плотность строго вниз под камерой: fpx / Hc поперёк и вглубь", () => {
  const sample = densityAt({ Hc: 2, tilt: 90 * DEG, fpx: 1000 }, 0);
  close(sample.across, 500);
  close(sample.depth, 500);
  close(sample.D, 2);
});

const frame = { width: 1920, height: 1080, sensorWidth: 4.8 };
const zone = zoneGeometry("side", 3, 1, 2);
const request = (changes: Partial<LensRequest>): LensRequest => ({
  mode: "auto",
  focalLength: 0,
  hfov: 0,
  margin: 0,
  zoneWidth: 2,
  focalRange: null,
  ...changes,
});

test("заданный фокус: fpx = Nw × f / s", () => {
  const lens = fitLens(
    frame,
    zone,
    request({ mode: "focal", focalLength: 4 }),
    "landscape",
  );
  close(lens.fpx, (1920 * 4) / 4.8);
  close(lens.hfov, 2 * Math.atan(4.8 / 8));
  assert.equal(lens.fNeeded, null);
  assert.equal(lens.rotated, false);
});

test("заданный угол: f = s / (2 tg(HFOV/2))", () => {
  const lens = fitLens(
    frame,
    zone,
    request({ mode: "angle", hfov: 90 * DEG }),
    "landscape",
  );
  close(lens.f, 2.4);
});

test("подбор с упором в объектив: фокус ограничен диапазоном, упор отмечен", () => {
  const free = fitLens(frame, zone, request({}), "landscape");
  const range = { min: 0.5, max: free.f / 2 };
  const limited = fitLens(
    frame,
    zone,
    request({ focalRange: range }),
    "landscape",
  );
  close(limited.f, range.max);
  close(limited.fNeeded ?? NaN, free.f);
  assert.equal(isClamped(limited), true);
  assert.equal(isClamped(free), false);
});

test("поворот кадра: портрет меняет стороны кадра и ширину матрицы", () => {
  const lens = fitLens(
    frame,
    zone,
    request({ mode: "focal", focalLength: 4 }),
    "portrait",
  );
  assert.equal(lens.rotated, true);
  assert.deepEqual([lens.frameWidthPx, lens.frameHeightPx], [1080, 1920]);
  close(lens.hfov, 2 * Math.atan((4.8 * 1080) / 1920 / 8));
});
