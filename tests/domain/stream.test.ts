// Поток камеры, нагрузка на декодер и выдержка.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  describeStream,
  shutterDenominator,
} from "../../src/domain/compute-type/stream.ts";
import { decodableStreams } from "../../src/domain/references/gpu-catalog.ts";

const stream = (changes: Partial<Parameters<typeof describeStream>[0]>) =>
  describeStream({
    count: 1,
    frameWidthPx: 1920,
    frameHeightPx: 1080,
    fps: 30,
    analyticsFpsSet: 5,
    bitsPerPixel: 0.04,
    sceneFactor: 1,
    ...changes,
  });

test("кодек по битам на пиксель: 0,04 — H.265, 0,07 — H.264", () => {
  assert.equal(stream({}).codec, "h265");
  assert.equal(stream({ bitsPerPixel: 0.07 }).codec, "h264");
});

test("битрейт = пиксели × кадр/с × бит на пиксель × сцена", () => {
  assert.equal(
    stream({ sceneFactor: 1.5 }).bitrateMbps,
    (1920 * 1080 * 30 * 0.04 * 1.5) / 1e6,
  );
});

test("декодер: камера 1080p@30 — один опорный поток, кадр 1,5 байта на пиксель", () => {
  const result = stream({ count: 4 });
  assert.equal(result.decodeUnits, 4);
  assert.equal(result.frameGB, (1920 * 1080 * 1.5) / 1e9);
});

test("частота аналитики не больше частоты потока", () => {
  const result = stream({ fps: 12, analyticsFpsSet: 25 });
  assert.deepEqual([result.analyticsFps, result.analyticsFpsSet], [12, 25]);
});

test("выдержка: смаз не больше blurPx при наибольшей плотности", () => {
  // 1 м/с при 500 px/м и смазе 2 px — не длиннее 1/250 с
  assert.equal(shutterDenominator(1, 500, 2), 250);
});

test("ёмкость декодера: NVDEC по поколению или замер Jetson", () => {
  const base = {
    id: "g",
    name: "G",
    tflops: 1,
    memoryGB: 1,
    tdpW: 1,
    price: 1,
  };
  // 2 × 1641 к/с 1080p H.265 у Ada / 30 к/с
  assert.equal(
    decodableStreams({ ...base, arch: "Ada", nvdec: 2 }, "h265"),
    (2 * 1641) / 30,
  );
  assert.equal(
    decodableStreams(
      { ...base, arch: "Ampere", decodeStreams: { h264: 5, h265: 10 } },
      "h264",
    ),
    5,
  );
});
