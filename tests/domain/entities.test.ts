// Функции разбора сущностей: допустимые данные, каждое правило поля, лишние поля.
import { test } from "vitest";
import assert from "node:assert/strict";
import { parseCamera } from "../../src/domain/entities/camera.ts";
import {
  parseCameraType,
  parseSceneObject,
} from "../../src/domain/entities/camera-type.ts";
import { parseModel } from "../../src/domain/entities/model.ts";
import { parseDetectionObject } from "../../src/domain/entities/detection-object.ts";
import { BUILTIN_DETECTION_OBJECTS } from "../../src/domain/references/detection-objects.ts";
import { parseGpu } from "../../src/domain/entities/gpu.ts";
import {
  onlyValueErrors,
  type ParseResult,
} from "../../src/domain/entities/parse-result.ts";
import { parseSystemSettings } from "../../src/domain/entities/system-settings.ts";

// поля с ошибкой и коды правил
const errorsOf = (parsed: ParseResult<unknown>) =>
  parsed.ok ? [] : parsed.errors.map((error) => `${error.field}:${error.code}`);

const gpu = {
  id: "c1",
  name: "Моя карта",
  arch: "Ada",
  tflops: 50,
  nvdec: 2,
  memoryGB: 24,
  tdpW: 300,
  price: 1500,
  custom: true,
};
const jetson = {
  ...gpu,
  arch: "Ampere",
  nvdec: undefined,
  decodeStreams: { h264: 11.6, h265: 22 },
  jetson: true,
};

test("parseGpu: допустимая карта и Jetson", () => {
  assert.deepEqual(parseGpu(gpu), { ok: true, value: gpu });
  const { nvdec, ...jetsonValue } = jetson;
  assert.deepEqual(parseGpu(jetson), { ok: true, value: jetsonValue });
});

test("parseGpu: правило каждого поля", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ id: "" }, "id:required"],
    [{ name: " " }, "name:required"],
    [{ name: 5 }, "name:required"],
    [{ arch: "Pascal" }, "arch:oneOf"],
    [{ tflops: 0 }, "tflops:positive"],
    [{ tflops: "50" }, "tflops:positive"],
    [{ nvdec: -1 }, "nvdec:positive"],
    [{ nvdec: 1.5 }, "nvdec:integer"],
    [{ memoryGB: NaN }, "memoryGB:positive"],
    [{ tdpW: -1 }, "tdpW:nonNegative"],
    [{ price: undefined }, "price:positive"],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(errorsOf(parseGpu({ ...gpu, ...change })), [expected]);
  assert.deepEqual(errorsOf(parseGpu({ ...gpu, tdpW: 0 })), []);
  assert.deepEqual(
    errorsOf(parseGpu({ ...jetson, decodeStreams: { h264: 0, h265: 22 } })),
    ["decodeStreams.h264:positive"],
  );
  assert.deepEqual(errorsOf(parseGpu({ ...jetson, decodeStreams: null })), [
    "decodeStreams.h264:positive",
    "decodeStreams.h265:positive",
  ]);
});

test("parseGpu: лишние поля не попадают в значение, не объект — ошибка", () => {
  assert.deepEqual(parseGpu({ ...gpu, extra: 1, decodeStreams: {} }), {
    ok: true,
    value: gpu,
  });
  assert.equal(parseGpu(null).ok, false);
  assert.equal(parseGpu("gpu").ok, false);
});

const camera = {
  id: "m1",
  name: "Моя камера",
  Nw: 1920,
  Nh: 1080,
  sensorWidth: 5.6,
  focalMin: 2.8,
  focalMax: 12,
  price: 200,
  custom: true,
};

test("parseCamera: допустимая камера, без цены и без ограничения фокуса", () => {
  assert.deepEqual(parseCamera(camera), { ok: true, value: camera });
  const { price, ...noPrice } = camera;
  assert.deepEqual(parseCamera(noPrice), { ok: true, value: noPrice });
  const anyLens = { ...camera, focalMin: 0, focalMax: 0 };
  assert.deepEqual(parseCamera(anyLens), { ok: true, value: anyLens });
});

test("parseCamera: правило каждого поля", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ id: undefined }, "id:required"],
    [{ name: "" }, "name:required"],
    [{ Nw: 0 }, "Nw:positive"],
    [{ Nh: "1080" }, "Nh:positive"],
    [{ Nw: 1920.5 }, "Nw:integer"],
    [{ sensorWidth: -5 }, "sensorWidth:positive"],
    [{ focalMin: -1 }, "focalMin:nonNegative"],
    [{ focalMax: 2 }, "focalMax:order"],
    [{ price: -1 }, "price:nonNegative"],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(errorsOf(parseCamera({ ...camera, ...change })), [
      expected,
    ]);
});

test("parseCamera: лишние поля не попадают в значение", () => {
  assert.deepEqual(parseCamera({ ...camera, fov: 90 }), {
    ok: true,
    value: camera,
  });
});

const customModel = {
  id: "d1",
  name: "Моя модель",
  fps: 120,
  inputSize: 640,
  refGpu: "5090",
  gflops: 0,
  custom: true,
};

test("parseModel: допустимая модель", () => {
  assert.deepEqual(parseModel(customModel), { ok: true, value: customModel });
});

test("parseModel: правило каждого поля", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ id: "" }, "id:required"],
    [{ name: undefined }, "name:required"],
    [{ fps: 0 }, "fps:positive"],
    [{ inputSize: "640" }, "inputSize:positive"],
    [{ refGpu: "" }, "refGpu:required"],
    [{ gflops: -1 }, "gflops:nonNegative"],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(errorsOf(parseModel({ ...customModel, ...change })), [
      expected,
    ]);
});

test("parseModel: лишние поля не попадают в значение", () => {
  assert.deepEqual(parseModel({ ...customModel, ref: 1 }), {
    ok: true,
    value: customModel,
  });
});

const detectionObject = {
  id: "o1",
  name: "Мой объект",
  width: 1.3,
  length: 1.3,
  height: 0.7,
  requiredPx: 10,
  custom: true,
};

test("parseDetectionObject: допустимый объект", () => {
  assert.deepEqual(parseDetectionObject(detectionObject), {
    ok: true,
    value: detectionObject,
  });
});

test("parseDetectionObject: правило каждого поля", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ id: "" }, "id:required"],
    [{ name: " " }, "name:required"],
    [{ width: 0 }, "width:positive"],
    [{ length: "30" }, "length:positive"],
    [{ height: -1 }, "height:positive"],
    [{ requiredPx: undefined }, "requiredPx:positive"],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(
      errorsOf(parseDetectionObject({ ...detectionObject, ...change })),
      [expected],
    );
});

test("parseDetectionObject: лишние поля не попадают в значение", () => {
  assert.deepEqual(parseDetectionObject({ ...detectionObject, ref: 1 }), {
    ok: true,
    value: detectionObject,
  });
});

test("встроенные объекты детекции проходят правила своего объекта", () => {
  for (const builtin of BUILTIN_DETECTION_OBJECTS)
    assert.ok(parseDetectionObject({ ...builtin, name: builtin.id }).ok);
});

// значение разбора; разбор не прошёл — undefined
const valueOf = <T>(parsed: ParseResult<T>) =>
  parsed.ok ? parsed.value : undefined;

// черновики: числа строками, как введены, в том числе пустые и недопустимые
const sceneObject = {
  name: "",
  nameKey: "presetNames.0",
  width: "50",
  length: 30,
  height: "",
  requiredPx: "abc",
  model: "y26s",
  feed: "roi",
  inputSize: "640",
  overlap: 20,
};

// числа черновика разобраны: не число — NaN
const sceneObjectValue = {
  ...sceneObject,
  width: 50,
  height: NaN,
  requiredPx: NaN,
  inputSize: 640,
};

test("parseSceneObject: черновик с любыми строками в числовых полях", () => {
  assert.deepEqual(parseSceneObject(sceneObject), {
    ok: true,
    value: sceneObjectValue,
  });
});

test("parseSceneObject: числа — допустимое, пустое, десятичная запятая, подстановки", () => {
  const parsed = (change: Record<string, unknown>) =>
    valueOf(parseSceneObject({ ...sceneObject, ...change }));
  assert.equal(parsed({ width: "12,5" })?.width, 12.5);
  assert.equal(parsed({ width: "" })?.width, NaN);
  assert.equal(parsed({ requiredPx: 24 })?.requiredPx, 24);
  // без входа модели — 640
  assert.equal(parsed({ inputSize: "1280" })?.inputSize, 1280);
  assert.equal(parsed({ inputSize: "" })?.inputSize, 640);
  assert.equal(parsed({ inputSize: "0" })?.inputSize, 640);
  assert.equal(parsed({ overlap: "12,5" })?.overlap, 12.5);
  assert.equal(parsed({ overlap: "0" })?.overlap, 0);
});

test("parseSceneObject: отрицательное число и пустое перекрытие — ошибка значения", () => {
  const errors = (change: Record<string, unknown>) =>
    errorsOf(parseSceneObject({ ...sceneObject, ...change }));
  assert.deepEqual(errors({ width: "-1" }), ["width:nonNegative"]);
  assert.deepEqual(errors({ inputSize: "-640" }), ["inputSize:nonNegative"]);
  assert.deepEqual(errors({ overlap: "" }), ["overlap:nonNegative"]);
  assert.deepEqual(errors({ overlap: "abc" }), ["overlap:nonNegative"]);
  assert.deepEqual(errors({ overlap: "-5" }), ["overlap:nonNegative"]);
});

test("parseSceneObject: правило каждого поля", () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ name: null }, "name:required"],
    [{ width: undefined }, "width:required"],
    [{ length: NaN }, "length:required"],
    [{ height: {} }, "height:required"],
    [{ requiredPx: true }, "requiredPx:required"],
    [{ model: "" }, "model:required"],
    [{ feed: "crop" }, "feed:oneOf"],
    [{ inputSize: null }, "inputSize:required"],
    [{ overlap: undefined }, "overlap:required"],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(
      errorsOf(parseSceneObject({ ...sceneObject, ...change })),
      [expected],
    );
});

const inputs = {
  camera: "",
  cameraHeight: "4",
  planeHeight: "0.9",
  zoneStart: "1.5",
  zoneDepth: "3",
  zoneWidth: "",
  margin: "10",
  resolution: "1",
  sensor: "3",
  sensorWidth: "5.4",
  pixelPitch: "2.0",
  orientation: "auto",
  focalLength: "6",
  hfov: "50",
  fps: 12,
  analyticsFps: "5",
  codec: "0.04",
  scene: "1",
  lensFactor: "0.6",
  speed: "1",
  blurPx: "2",
  lensMode: "auto",
  placement: "side",
};
const cameraType = {
  id: "t1",
  name: "Проход",
  count: "10",
  inputs,
  objects: [sceneObject],
};
const cameraTypeValue = {
  ...cameraType,
  count: 10,
  inputs: {
    ...inputs,
    cameraHeight: 4,
    planeHeight: 0.9,
    zoneStart: 1.5,
    zoneDepth: 3,
    zoneWidth: NaN,
    margin: 10,
    resolution: 1,
    sensor: 3,
    sensorWidth: 5.4,
    pixelPitch: 2,
    focalLength: 6,
    hfov: 50,
    analyticsFps: 5,
    codec: 0.04,
    scene: 1,
    lensFactor: 0.6,
    speed: 1,
    blurPx: 2,
  },
  objects: [sceneObjectValue],
};

test("parseCameraType: черновик типа, nameKey сохраняется", () => {
  assert.deepEqual(parseCameraType(cameraType), {
    ok: true,
    value: cameraTypeValue,
  });
  const builtin = { ...cameraType, nameKey: "typeNames.0", objects: [] };
  assert.deepEqual(parseCameraType(builtin), {
    ok: true,
    value: { ...cameraTypeValue, nameKey: "typeNames.0", objects: [] },
  });
});

test("parseCameraType: числа — допустимое, пустое, десятичная запятая, подстановки", () => {
  const parsed = (change: Record<string, unknown>) =>
    valueOf(parseCameraType({ ...cameraType, ...change }));
  const parsedInputs = (change: Record<string, unknown>) =>
    parsed({ inputs: { ...inputs, ...change } })?.inputs;
  assert.equal(parsedInputs({ cameraHeight: "4,5" })?.cameraHeight, 4.5);
  assert.equal(parsedInputs({ cameraHeight: "" })?.cameraHeight, NaN);
  assert.equal(parsedInputs({ hfov: 60 })?.hfov, 60);
  assert.equal(parsed({ count: "0" })?.count, 0);
  assert.equal(parsedInputs({ margin: "0" })?.margin, 0);
  // индексы и значения списков — Number: пустая строка — 0
  assert.equal(parsedInputs({ resolution: "" })?.resolution, 0);
  assert.equal(parsedInputs({ codec: "0.07" })?.codec, 0.07);
});

test("parseCameraType: число камер, запас кадра и отрицательные числа — ошибка значения", () => {
  const errors = (change: Record<string, unknown>) =>
    errorsOf(parseCameraType({ ...cameraType, ...change }));
  const inputErrors = (change: Record<string, unknown>) =>
    errors({ inputs: { ...inputs, ...change } });
  assert.deepEqual(errors({ count: "2,6" }), ["count:integer"]);
  assert.deepEqual(errors({ count: "1.5" }), ["count:integer"]);
  assert.deepEqual(errors({ count: "" }), ["count:nonNegative"]);
  assert.deepEqual(errors({ count: "-3" }), ["count:nonNegative"]);
  assert.deepEqual(inputErrors({ margin: "" }), ["inputs.margin:nonNegative"]);
  assert.deepEqual(inputErrors({ cameraHeight: "-1" }), [
    "inputs.cameraHeight:nonNegative",
  ]);
  assert.deepEqual(inputErrors({ zoneStart: "-0.5" }), [
    "inputs.zoneStart:nonNegative",
  ]);
  assert.deepEqual(errors({ objects: [{ ...sceneObject, height: "-1" }] }), [
    "objects.0.height:nonNegative",
  ]);
});

test("onlyValueErrors: черновик с недопустимым числом сохраняется, с другой ошибкой — нет", () => {
  const errors = (change: Record<string, unknown>) => {
    const parsed = parseCameraType({ ...cameraType, ...change });
    return parsed.ok ? [] : parsed.errors;
  };
  assert.equal(onlyValueErrors(errors({ count: "-3" })), true);
  assert.equal(onlyValueErrors(errors({ count: "1.5" })), true);
  assert.equal(onlyValueErrors(errors({ count: null })), false);
  assert.equal(
    onlyValueErrors(errors({ inputs: { ...inputs, placement: "wall" } })),
    false,
  );
});

test("parseCameraType: правило каждого поля, ошибки inputs и объектов с путём", () => {
  const cases: [Record<string, unknown>, string[]][] = [
    [{ id: "" }, ["id:required"]],
    [{ name: 1 }, ["name:required"]],
    [{ count: null }, ["count:required"]],
    [{ objects: undefined }, ["objects:required"]],
    [
      { objects: [sceneObject, { ...sceneObject, feed: "crop" }] },
      ["objects.1.feed:oneOf"],
    ],
    [{ inputs: { ...inputs, camera: null } }, ["inputs.camera:required"]],
    [{ inputs: { ...inputs, zoneDepth: {} } }, ["inputs.zoneDepth:required"]],
    [{ inputs: { ...inputs, orientation: "x" } }, ["inputs.orientation:oneOf"]],
    [{ inputs: { ...inputs, lensMode: "" } }, ["inputs.lensMode:oneOf"]],
    [{ inputs: { ...inputs, placement: "wall" } }, ["inputs.placement:oneOf"]],
  ];
  for (const [change, expected] of cases)
    assert.deepEqual(
      errorsOf(parseCameraType({ ...cameraType, ...change })),
      expected,
    );
  const { blurPx, ...noBlur } = inputs;
  assert.deepEqual(
    errorsOf(parseCameraType({ ...cameraType, inputs: noBlur })),
    ["inputs.blurPx:required"],
  );
});

test("parseCameraType: лишние поля типа, inputs и объектов не попадают в значение", () => {
  assert.deepEqual(
    parseCameraType({
      ...cameraType,
      extra: 1,
      inputs: { ...inputs, mg: "10" },
      objects: [{ ...sceneObject, fps: 5, ref: "x" }],
    }),
    { ok: true, value: cameraTypeValue },
  );
});

const settings = {
  efficiency: "0.6",
  reserve: "20",
  archiveDays: "0",
  gpu: "auto",
  gpuCount: "auto",
};

test("parseSystemSettings: черновик, правило каждого поля, лишние поля", () => {
  assert.deepEqual(parseSystemSettings({ ...settings, kr: "1" }), {
    ok: true,
    value: {
      efficiency: 0.6,
      reserve: 20,
      archiveDays: 0,
      gpu: "auto",
      gpuCount: "auto",
    },
  });
  for (const field of Object.keys(settings))
    assert.deepEqual(
      errorsOf(parseSystemSettings({ ...settings, [field]: 1 })),
      [`${field}:required`],
    );
});

test("parseSystemSettings: числа — допустимое, пустое, десятичная запятая, подстановки", () => {
  const parsed = (change: Record<string, unknown>) =>
    valueOf(parseSystemSettings({ ...settings, ...change }));
  assert.equal(parsed({ efficiency: "0,5" })?.efficiency, 0.5);
  assert.equal(parsed({ reserve: "12,5" })?.reserve, 12.5);
  assert.equal(parsed({ reserve: "0" })?.reserve, 0);
  assert.equal(parsed({ archiveDays: "30" })?.archiveDays, 30);
  assert.equal(parsed({ gpuCount: "2" })?.gpuCount, 2);
  assert.equal(parsed({ gpu: "rtx4090" })?.gpu, "rtx4090");
});

test("parseSystemSettings: пустое, не число, отрицательное и дробный архив — ошибка", () => {
  const errors = (change: Record<string, unknown>) =>
    errorsOf(parseSystemSettings({ ...settings, ...change }));
  assert.deepEqual(errors({ efficiency: "" }), ["efficiency:positive"]);
  assert.deepEqual(errors({ efficiency: "0" }), ["efficiency:positive"]);
  assert.deepEqual(errors({ reserve: "" }), ["reserve:nonNegative"]);
  assert.deepEqual(errors({ reserve: "-5" }), ["reserve:nonNegative"]);
  assert.deepEqual(errors({ archiveDays: "" }), ["archiveDays:nonNegative"]);
  assert.deepEqual(errors({ archiveDays: "1.5" }), ["archiveDays:integer"]);
});
