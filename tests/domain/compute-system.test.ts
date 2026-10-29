// Подбор GPU и итоги системы. Свой детектор d — 100 кадр/с на входе 640 на GPU small,
// поэтому нагрузка в кадрах в секунду сразу переводится в долю GPU.
import { test } from "vitest";
import assert from "node:assert/strict";
import {
  computeSystem,
  systemTotals,
  type SystemCatalog,
} from "../../src/domain/compute-system/index.ts";
import type { TypeResult } from "../../src/domain/compute-type/index.ts";
import type { CustomDetector } from "../../src/domain/entities/detector.ts";
import type { Gpu } from "../../src/domain/entities/gpu.ts";
import type { SystemSettings } from "../../src/domain/entities/system-settings.ts";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);

const gpu = (
  changes: Pick<Gpu, "id"> &
    Partial<Pick<Gpu, "tflops" | "tdpW" | "price" | "jetson">>,
): Gpu => ({
  name: changes.id,
  arch: "Ada",
  tflops: 65,
  decodeStreams: { h264: 10, h265: 10 },
  memoryGB: 10,
  tdpW: 100,
  price: 1000,
  ...changes,
});
const small = gpu({ id: "small" }),
  big = gpu({ id: "big", tflops: 260, price: 3000 });
const detector: CustomDetector = {
  id: "d",
  name: "D",
  fps: 100,
  inputSize: 640,
  refGpu: "small",
  gflops: 0,
  custom: true,
};
const catalog = (gpus = [small, big]): SystemCatalog => ({
  gpus,
  candidates: gpus,
  detectors: [detector],
});
const settings = (changes: Partial<SystemSettings> = {}): SystemSettings => ({
  efficiency: 1,
  reserve: 0,
  archiveDays: 0,
  gpu: "auto",
  gpuCount: "auto",
  ...changes,
});

type Group = { model: string; inputSize: number; load: number };
// тип камер без ошибки: только поля, которые читают подбор и итоги
const computed = (
  changes: {
    count?: number;
    name?: string;
    camera?: string;
    groups?: Group[];
    decodeUnits?: number;
    frameGB?: number;
    bitrateMbps?: number;
  } = {},
): TypeResult =>
  ({
    ok: true,
    count: changes.count ?? 1,
    type: { name: changes.name ?? "T", inputs: { camera: changes.camera } },
    runGroups: (changes.groups ?? []).map(({ model, inputSize, load }) => ({
      model,
      feed: { inputSize },
      objects: [],
      load,
    })),
    stream: {
      codec: "h265",
      decodeUnits: changes.decodeUnits ?? 0,
      frameGB: changes.frameGB ?? 0,
      bitrateMbps: changes.bitrateMbps ?? 0,
    },
  }) as unknown as TypeResult;
const inputError = (count: number, camera?: string): TypeResult =>
  ({
    ok: false,
    count,
    type: { name: "E", inputs: { camera } },
  }) as unknown as TypeResult;

test("инференс: свой детектор — замер × (вход замера / вход)² × TFLOPS / TFLOPS замера × эффективность", () => {
  // на big (260 TFLOPS) при входе 320: 100 × 4 × 4 = 1600 кадр/с, × 0,5 = 800
  const { chosen } = computeSystem(
    [computed({ groups: [{ model: "d", inputSize: 320, load: 400 }] })],
    settings({ efficiency: 0.5, gpu: "big", gpuCount: 1 }),
    catalog(),
  );
  const [run] = chosen.runs;
  assert.ok(!run.unknownModel);
  assert.equal(run.capacity, 800);
  assert.equal(chosen.inferenceLoad, 0.5);
});

test("инференс: модель каталога — 1000 / задержка на T4 × (640 / вход)² × TFLOPS / 65", () => {
  // YOLO26s: 2,5 мс на T4 — 400 кадр/с; small равна T4 по TFLOPS
  const { chosen } = computeSystem(
    [computed({ groups: [{ model: "y26s", inputSize: 640, load: 100 }] })],
    settings({ gpu: "small", gpuCount: 1 }),
    catalog(),
  );
  assert.equal(chosen.inferenceLoad, 0.25);
});

test("неизвестная модель не нагружает инференс", () => {
  const { chosen } = computeSystem(
    [computed({ groups: [{ model: "нет", inputSize: 640, load: 100 }] })],
    settings({ gpu: "small", gpuCount: 1 }),
    catalog(),
  );
  assert.equal(chosen.runs[0].unknownModel, true);
  assert.equal(chosen.inferenceLoad, 0);
});

test("декодер: потоки 1080p@30 / (ёмкость GPU × эффективность) / число карт", () => {
  // 5 потоков на 10 потоков H.265 — половина одной карты, на двух картах — четверть
  const { chosen, decodeUnitsTotal } = computeSystem(
    [computed({ decodeUnits: 3 }), computed({ decodeUnits: 2 })],
    settings({ gpu: "small", gpuCount: 2 }),
    catalog(),
  );
  assert.equal(decodeUnitsTotal, 5);
  assert.equal(chosen.decodeGpus, 0.5);
  assert.equal(chosen.decodeLoad, 0.25);
});

test("память: база + движок один раз на модель и вход + 20 кадров на поток карты", () => {
  // два типа с одним движком d@640: 0,8 + 0,5; по 3 камеры на 2 картах — ⌈1,5⌉ = 2 потока
  // на карту на тип: 2 × 2 × 20 × 0,01 ГБ = 0,8
  const group = { model: "d", inputSize: 640, load: 1 };
  const results = [
    computed({ count: 3, frameGB: 0.01, groups: [group] }),
    computed({ count: 3, frameGB: 0.01, groups: [group] }),
  ];
  const { chosen } = computeSystem(
    results,
    settings({ gpu: "small", gpuCount: 2 }),
    catalog(),
  );
  near(chosen.memoryUseGB, 2.1);
  assert.equal(chosen.memoryCapGB, 9);
  // у Jetson доступно 60 % памяти
  const jetson = gpu({ id: "jetson", jetson: true });
  const onJetson = computeSystem(
    results,
    settings({ gpu: "jetson", gpuCount: 1 }),
    catalog([jetson]),
  );
  assert.equal(onJetson.chosen.memoryCapGB, 6);
});

test("узкое место — ресурс с наибольшей загрузкой", () => {
  const bottleneck = (result: TypeResult) =>
    computeSystem([result], settings({ gpu: "small", gpuCount: 1 }), catalog())
      .chosen.bottleneck;
  assert.equal(
    bottleneck(
      computed({ groups: [{ model: "d", inputSize: 640, load: 90 }] }),
    ),
    "inference",
  );
  assert.equal(bottleneck(computed({ decodeUnits: 9 })), "decoder");
  assert.equal(bottleneck(computed({ frameGB: 0.4 })), "memory");
});

// 150 кадр/с детектора: small × 1 — 150 %, small × 2 — 75 % за $2000, big × 1 — 37,5 % за $3000
const load150 = [
  computed({ groups: [{ model: "d", inputSize: 640, load: 150 }] }),
];

test("оптимум — самый дешёвый вариант в пределах запаса", () => {
  const system = computeSystem(load150, settings({ reserve: 25 }), catalog());
  assert.equal(system.maxLoad, 0.8);
  assert.deepEqual(
    [system.optimum?.gpu.id, system.optimum?.count, system.optimum?.cost],
    ["small", 2, 2000],
  );
  assert.equal(system.chosen, system.optimum);
  // запас 50 %: 75 % больше 1 / 1,5, подходит только big
  const strict = computeSystem(load150, settings({ reserve: 50 }), catalog());
  assert.equal(strict.chosen.gpu.id, "big");
});

test("при равной цене — меньшая суммарная мощность", () => {
  const twin = gpu({ id: "twin", tdpW: 50 });
  const { optimum } = computeSystem(
    load150,
    settings(),
    catalog([small, twin]),
  );
  assert.equal(optimum?.gpu.id, "twin");
});

test("выбор GPU и количества в параметрах", () => {
  const chosen = (changes: Partial<SystemSettings>) => {
    const { gpu, count, ok } = computeSystem(
      load150,
      settings(changes),
      catalog(),
    ).chosen;
    return [gpu.id, count, ok];
  };
  // GPU задан — наименьшее число карт, которого хватает
  assert.deepEqual(chosen({ gpu: "small" }), ["small", 2, true]);
  // число задано — самый дешёвый подходящий GPU с этим числом
  assert.deepEqual(chosen({ gpuCount: 1 }), ["big", 1, true]);
  // задано всё — вариант как есть, даже если не хватает
  assert.deepEqual(chosen({ gpu: "small", gpuCount: 1 }), ["small", 1, false]);
});

test("ничего не подходит: наименее загруженный вариант или наибольшее число карт", () => {
  const heavy = [
    computed({ groups: [{ model: "d", inputSize: 640, load: 10000 }] }),
  ];
  const auto = computeSystem(heavy, settings(), catalog());
  assert.equal(auto.optimum, undefined);
  assert.deepEqual([auto.chosen.gpu.id, auto.chosen.count], ["big", 4]);
  const fixedGpu = computeSystem(heavy, settings({ gpu: "small" }), catalog());
  assert.deepEqual(
    [fixedGpu.chosen.gpu.id, fixedGpu.chosen.count],
    ["small", 4],
  );
});

test("нет GPU в подборе — первая карта каталога, одна", () => {
  const system = computeSystem(load150, settings(), {
    ...catalog(),
    candidates: [],
  });
  assert.equal(system.noCandidates, true);
  assert.deepEqual([system.chosen.gpu.id, system.chosen.count], ["small", 1]);
});

test("типы с ошибкой и без камер в подбор не входят", () => {
  const { liveResults } = computeSystem(
    [inputError(2), computed({ count: 0 }), computed({ count: 1 })],
    settings(),
    catalog(),
  );
  assert.equal(liveResults.length, 1);
});

test("итоги: камеры, поток, стоимость камер, PoE и архив", () => {
  const cameras = [
    {
      id: "c",
      Nw: 1,
      Nh: 1,
      sensorWidth: 1,
      focalMin: 0,
      focalMax: 0,
      price: 200,
    },
  ];
  const totals = systemTotals(
    [inputError(2, "c"), computed({ count: 3, camera: "c", bitrateMbps: 100 })],
    settings({ archiveDays: 10 }),
    cameras,
  );
  // камеры и их стоимость — по всем типам, поток — только по типам без ошибки
  assert.equal(totals.cameraCount, 5);
  assert.equal(totals.cameraCost, 1000);
  assert.equal(totals.totalMbps, 300);
  near(totals.poeW, 77);
  // 300 Мбит/с = 37,5 МБ/с × 86 400 с × 10 сут
  assert.equal(totals.archiveDays, 10);
  near(totals.archiveTB, 32.4);
});

test("порт: поток × 1,3 меньше 900 Мбит/с — 1 Гбит/с, меньше 9000 — 10 Гбит/с", () => {
  const port = (bitrateMbps: number) =>
    systemTotals([computed({ bitrateMbps })], settings(), []).port;
  assert.equal(port(690), "1G");
  assert.equal(port(700), "10G");
  assert.equal(port(7000), "over10G");
});
