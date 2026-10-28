// Расчёт типа камер совпадает с прежней реализацией. Фикстура снята один раз со старого
// computeType (src/js/compute-type.js в коммите 7cca661) на 30 конфигурациях: числа без
// округления, тексты на русском. Новый расчёт сравнивается с ней с относительным допуском 1e-9.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeType,
  type TypeResult,
} from "../../src/domain/compute-type/index.ts";
import type { Camera } from "../../src/domain/entities/camera.ts";
import type { CameraType } from "../../src/domain/entities/camera-type.ts";
import { BUILTIN_CAMERAS } from "../../src/domain/references/builtin-cameras.ts";

// тексты — на русском, как в фикстуре: язык выбирается при загрузке i18n
Object.defineProperty(globalThis, "localStorage", {
  value: { getItem: () => "ru" },
  configurable: true,
});
const text = await import("../../src/i18n/domain-text.ts");

type Case = {
  name: string;
  type: CameraType;
  cameraId: string | null;
  expected: Snapshot;
};
type Snapshot = { [key: string]: unknown };
const fixture: { customCameras: Camera[]; cases: Case[] } = JSON.parse(
  readFileSync(import.meta.dirname + "/fixtures/compute-type.json", "utf8"),
);
const cameras = [...BUILTIN_CAMERAS, ...fixture.customCameras];

// результат в полях старого computeType; функции заменены значениями, как в фикстуре
function oldShape(result: TypeResult): Snapshot {
  const common = {
    count: result.count,
    Nw: result.frame.width,
    Nh: result.frame.height,
    s: result.frame.sensorWidth,
    err: !result.ok,
  };
  if (!result.ok) return common;
  const { geometry, lens, density, stream } = result;
  const feedInfo = (feed: (typeof result.objects)[number]["feed"]) => ({
    feed: feed.mode,
    inputSize: feed.inputSize,
    modelScale: feed.modelScale,
    tiles: feed.tiles,
    tilesX: feed.tilesX,
    tilesY: feed.tilesY,
    text: text.feedText(feed),
  });
  const objs = result.objects.map((item) =>
    item.valid
      ? {
          bad: undefined,
          widthPx: item.widthPx,
          heightPx: item.heightPx,
          minSidePx: item.minSidePx,
          x0: item.x0,
          requiredPx: item.requiredPx,
          feedInfo: feedInfo(item.feed),
          modelPx: item.modelPx,
          status: item.status,
          minSensorWidthPx: item.minSensorWidthPx,
          sensorOk: item.sensorOk,
          sensorPxText: text.sensorPxText(item),
          modelPxText: text.modelPxText(item),
        }
      : { bad: true, feedInfo: feedInfo(item.feed) },
  );
  const densityAt = ({ x, D, z, phi, across, depth }: typeof density.near) => ({
    x,
    D,
    z,
    phi,
    across,
    depth,
  });
  return {
    ...common,
    fps: stream.fps,
    analyticsFps: stream.analyticsFps,
    analyticsFpsSet: stream.analyticsFpsSet,
    codec: stream.codec,
    clamped: lens.clamped,
    fNeeded: lens.fNeeded,
    placement: result.placement,
    mode: lens.mode,
    H: geometry.H,
    h: geometry.h,
    Hc: geometry.Hc,
    zoneStart: geometry.zoneStart,
    zoneDepth: geometry.zoneDepth,
    zoneWidth: geometry.zoneWidth,
    x1: geometry.x1,
    x2: geometry.x2,
    tilt: geometry.tilt,
    zoneAngle: geometry.zoneAngle,
    hfov: lens.hfov,
    vfov: lens.vfov,
    f: lens.f,
    rotated: lens.rotated,
    frameWidthPx: lens.frameWidthPx,
    frameHeightPx: lens.frameHeightPx,
    fpx: lens.fpx,
    edge1: densityAt(density.near),
    edge2: densityAt(density.far),
    minAcross: density.minAcross,
    minDepthDensity: density.minDepth,
    maxDensity: density.max,
    objs,
    notes: result.notes.map(text.noteText),
    status: result.status,
    pill: text.verdictPill(result.verdict, result.notes),
    headline: text.verdictHeadline(result.verdict),
    groups: result.runGroups.map((group) => ({
      model: group.model,
      feed: group.feed.mode,
      feedInfo: feedInfo(group.feed),
      names: group.objects.map(text.objectName),
      load: group.load,
    })),
    shutterDenominator: result.shutterDenominator,
    bitrateMbps: stream.bitrateMbps,
    decUnits: stream.decodeUnits,
    frameGB: stream.frameGB,
    frameWidthNear: geometry.frameWidthNear,
    frameWidthFar: geometry.frameWidthFar,
  };
}

// поля фикстуры, которые есть в actual; NaN и Infinity в фикстуре записаны строками
function pick(expected: unknown, actual: unknown): unknown {
  if (typeof actual === "number" && typeof expected === "string")
    return Number(expected);
  if (Array.isArray(actual) && Array.isArray(expected))
    return expected.map((item, i) => pick(item, actual[i]));
  if (
    actual &&
    typeof actual === "object" &&
    expected &&
    typeof expected === "object"
  )
    return Object.fromEntries(
      Object.keys(actual).map((key) => [
        key,
        pick((expected as Snapshot)[key], (actual as Snapshot)[key]),
      ]),
    );
  return expected;
}

function assertClose(actual: unknown, expected: unknown, path: string) {
  if (typeof actual === "number" && typeof expected === "number") {
    if (Number.isNaN(expected) || !Number.isFinite(expected))
      return assert.ok(
        Object.is(actual, expected),
        `${path}: ${actual} ≠ ${expected}`,
      );
    const tolerance = 1e-9 * Math.max(1, Math.abs(expected));
    return assert.ok(
      Math.abs(actual - expected) <= tolerance,
      `${path}: ${actual} ≠ ${expected}`,
    );
  }
  if (
    actual &&
    typeof actual === "object" &&
    expected &&
    typeof expected === "object"
  ) {
    assert.deepEqual(
      Object.keys(actual),
      Object.keys(expected),
      `${path}: поля`,
    );
    for (const key of Object.keys(actual))
      assertClose(
        (actual as Snapshot)[key],
        (expected as Snapshot)[key],
        `${path}.${key}`,
      );
    return;
  }
  assert.equal(actual, expected, path);
}

for (const { name, type, cameraId, expected } of fixture.cases)
  test(name, () => {
    const camera = cameras.find((item) => item.id === cameraId);
    const actual = oldShape(computeType(type, camera));
    assertClose(actual, pick(expected, actual), "result");
  });
