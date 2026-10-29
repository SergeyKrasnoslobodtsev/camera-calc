// Подача в модель, статусы объектов, вердикт, советы и группы запусков.
// Камера строго вниз на высоте Hc = 2 м с fpx = 1000: плоский объект 10 × 10 см даёт рамку 50 × 50 px.
import { test } from "vitest";
import assert from "node:assert/strict";
import { describeFeed } from "../../src/domain/compute-type/feed.ts";
import { runGroups } from "../../src/domain/compute-type/run-groups.ts";
import {
  evaluateObject,
  type ObjectContext,
  type ValidObject,
} from "../../src/domain/compute-type/scene-object.ts";
import {
  assessObjects,
  type Note,
} from "../../src/domain/compute-type/verdict.ts";
import { zoneGeometry } from "../../src/domain/compute-type/zone.ts";
import type {
  FeedMode,
  SceneObject,
} from "../../src/domain/entities/camera-type.ts";

test("подача тайлами: шаг input × (1 − перекрытие)", () => {
  // шаг 512 px: по ширине ⌈(1500 − 640) / 512⌉ + 1 = 3, по высоте ⌈60 / 512⌉ + 1 = 2
  const feed = describeFeed(
    "tiles",
    640,
    20,
    { width: 1920, height: 1080 },
    { width: 1500, height: 700 },
  );
  assert.deepEqual(
    [feed.tilesX, feed.tilesY, feed.tiles, feed.modelScale],
    [3, 2, 6, 1],
  );
  // ROI меньше входа — один тайл
  assert.equal(
    describeFeed(
      "tiles",
      640,
      20,
      { width: 1920, height: 1080 },
      { width: 600, height: 300 },
    ).tiles,
    1,
  );
});

test("подача кадром и вырезом: уменьшение по большей стороне, не больше 1", () => {
  const frame = { width: 1920, height: 1080 },
    roi = { width: 800, height: 400 };
  assert.equal(describeFeed("full", 640, 0, frame, roi).modelScale, 640 / 1920);
  assert.equal(describeFeed("roi", 640, 0, frame, roi).modelScale, 640 / 800);
  assert.equal(describeFeed("roi", 1280, 0, frame, roi).modelScale, 1);
});

const Hc = 2;
const zone = zoneGeometry("top", Hc, 0, 1);
const context = (frameWidth = 1000): ObjectContext => ({
  view: { Hc, tilt: zone.tilt, fpx: 1000 },
  k: 1,
  zone,
  frameWidth,
  frame: { width: 4000, height: 3000 },
  roi: { width: 100, height: 100 },
});
const object = (
  requiredPx: number,
  feed: FeedMode = "roi",
  name = "Деталь",
): SceneObject => ({
  name,
  width: 10,
  length: 10,
  height: 0,
  requiredPx,
  model: "y26s",
  feed,
  inputSize: 640,
  overlap: 20,
});
const evaluate = (item: SceneObject, frameWidth?: number) => {
  const result = evaluateObject(item, context(frameWidth));
  assert.ok(result.valid);
  return result;
};

test("рамка плоского объекта под камерой: 50 × 50 px", () => {
  const result = evaluate(object(40));
  assert.ok(
    Math.abs(result.widthPx - 50) < 1e-6 &&
      Math.abs(result.heightPx - 50) < 1e-6,
  );
});

test("статус: порог выполнен — ok, от 75% порога — warn, ниже — bad", () => {
  assert.equal(evaluate(object(49)).status, "ok");
  assert.equal(evaluate(object(60)).status, "warn"); // 50 / 60 ≈ 0,83
  assert.equal(evaluate(object(70)).status, "bad"); // 50 / 70 ≈ 0,71
});

test("объект без габаритов или порога не рассчитывается", () => {
  assert.equal(
    evaluateObject({ ...object(40), width: 0, length: 0 }, context()).valid,
    false,
  );
  assert.equal(evaluateObject(object(0), context()).valid, false);
});

const topView: Note = { code: "topView", values: {} };

test("вердикт ok: самый мелкий объект; замечание сцены переводит статус в warn", () => {
  const small = evaluate({ ...object(10), width: 5 }),
    large = evaluate(object(10));
  const clean = assessObjects([large, small], []);
  assert.deepEqual(clean.verdict, { code: "ok", object: small });
  assert.equal(clean.status, "ok");
  assert.equal(assessObjects([large], [topView]).status, "warn");
});

test("вердикт без объектов — warn, на грани — warn со списком", () => {
  assert.deepEqual(assessObjects([], []), {
    verdict: { code: "noObjects" },
    status: "warn",
    notes: [],
  });
  const marginal = evaluate(object(60));
  assert.deepEqual(assessObjects([marginal], []).verdict, {
    code: "warn",
    objects: [marginal],
  });
});

test("bad: разрешение — первым советом, уменьшение до входа — последним", () => {
  // на матрице 50 px: порог 100 не выполняется и на матрице — нужен кадр шириной 1000 × 100 / 50
  const lowResolution = evaluate(object(100, "roi", "Номер"));
  // подача кадром 4000 px во вход 640: на входе 8 px при пороге 21, на матрице хватает
  const downscaled = evaluate(object(21, "full", "Гайка"));
  const { verdict, status, notes } = assessObjects(
    [lowResolution, downscaled],
    [topView],
  );
  assert.equal(status, "bad");
  assert.deepEqual(verdict, {
    code: "bad",
    objects: [lowResolution, downscaled],
  });
  assert.deepEqual(
    notes.map((note) => note.code),
    ["resolution", "topView", "downscale"],
  );
  const [resolution, , downscale] = notes;
  assert.ok(resolution.code === "resolution" && downscale.code === "downscale");
  assert.equal(resolution.values.resolution.width, 2560); // первое разрешение не уже 2000 px
  // вход 640 × 21 / 8 = 1680 → кратно 32 вверх
  assert.equal(downscale.values.neededInputSize, 1696);
});

test("разрешения не хватает ни одного — отдельный код", () => {
  const huge = evaluate(object(1000));
  assert.deepEqual(
    assessObjects([huge], []).notes.map((note) => note.code),
    ["resolutionNone"],
  );
});

test("группы запусков: одна модель и подача — один запуск, тайлы с разным перекрытием — разные", () => {
  const items: ValidObject[] = [
    evaluate(object(10, "roi", "А")),
    evaluate(object(10, "roi", "Б")),
    evaluate({ ...object(10, "tiles", "В"), overlap: 20 }),
    evaluate({ ...object(10, "tiles", "Г"), overlap: 50 }),
  ];
  const groups = runGroups(items, 10, 5);
  assert.deepEqual(
    groups.map((group) => group.objects.map(({ object }) => object.name)),
    [["А", "Б"], ["В"], ["Г"]],
  );
  // 10 камер × 5 кадр/с × тайлов (ROI 100 px во вход 640 — один тайл)
  assert.deepEqual(
    groups.map((group) => group.load),
    [50, 50, 50],
  );
});
