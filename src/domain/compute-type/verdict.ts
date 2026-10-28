import { DEG } from "../angles.ts";
import { RESOLUTIONS, type Resolution } from "../references/resolutions.ts";
import { frameWidthAt, type FocalRange, type LensFit } from "./lens.ts";
import type {
  ObjectResult,
  ObjectStatus,
  ValidObject,
} from "./scene-object.ts";
import type { Zone } from "./zone.ts";

// Пороги замечаний; источник значений не указан
const FOCAL_CLAMP_NOTE_MM = 0.05; // разница с нужным фокусом, после которой упор заметен, мм
const FOCAL_RANGE_TOLERANCE = 0.02; // допуск на диапазон объектива, доля
const WIDE_ANGLE_DEG = 100; // HFOV, после которого заметна дисторсия
const TOP_VIEW_TILT_DEG = 75; // наклон, после которого вид считается видом сверху
const LOW_RAY_DEG = 15; // луч к плоскости положе — объекты перекрывают друг друга
// сторона входа YOLO кратна наибольшему шагу (stride) сети — 32 px
const INPUT_SIZE_STEP = 32;

// Замечание — код и значения для текста: числа (углы в градусах, длины в м и мм, размеры в px)
// и объект из того же результата расчёта, к которому относится совет.
export type Note =
  | { code: "zoneWidth"; values: { frameWidth: number; zoneWidth: number } }
  | {
      code: "zoneDepth";
      values: { requiredAngle: number; availableAngle: number };
    }
  | { code: "focalMax"; values: { requiredFocal: number; focal: number } }
  | { code: "focalMin"; values: { requiredFocal: number; focal: number } }
  | {
      code: "focalOutOfRange";
      values: { focal: number; focalMin: number; focalMax: number };
    }
  | { code: "wideAngle"; values: { hfov: number } }
  | { code: "topView"; values: Record<string, never> }
  | { code: "lowRay"; values: { angle: number } }
  | {
      code: "analyticsFps";
      values: { analyticsFps: number; streamFps: number };
    }
  | {
      code: "downscale";
      values: { object: ValidObject; neededInputSize: number };
    }
  | {
      code: "resolution";
      values: { object: ValidObject; resolution: Resolution };
    }
  | { code: "resolutionNone"; values: { object: ValidObject } };

// Вердикт по объектам: objects — объекты, которые не проходят или на грани;
// у "ok" object — самый мелкий объект на входе модели.
export type Verdict =
  | { code: "noObjects" }
  | { code: "bad"; objects: ValidObject[] }
  | { code: "warn"; objects: ValidObject[] }
  | { code: "ok"; object: ValidObject };

export type SceneContext = {
  lens: LensFit;
  clamped: boolean;
  manualLens: boolean; // объектив задан фокусным расстоянием или углом, а не подобран
  focalRange: FocalRange | null;
  zone: Zone;
  zoneWidth: number;
  Hc: number;
  analyticsFpsSet: number;
  fps: number;
};

// замечания к геометрии, объективу и потоку — в порядке показа
export function sceneNotes(context: SceneContext): Note[] {
  const { lens, zone, clamped, manualLens, focalRange } = context;
  const { f, fNeeded, hfov, vfov } = lens;
  const notes: Note[] = [];
  if (clamped && fNeeded !== null)
    notes.push({
      code: fNeeded > f ? "focalMax" : "focalMin",
      values: { requiredFocal: fNeeded, focal: f },
    });
  if (manualLens || clamped) {
    const frameWidth = frameWidthAt(hfov, zone.minDepth);
    if (frameWidth < context.zoneWidth)
      notes.push({
        code: "zoneWidth",
        values: { frameWidth, zoneWidth: context.zoneWidth },
      });
    if (vfov < zone.zoneAngle)
      notes.push({
        code: "zoneDepth",
        values: {
          requiredAngle: zone.zoneAngle / DEG,
          availableAngle: vfov / DEG,
        },
      });
  }
  if (
    !clamped &&
    manualLens &&
    focalRange &&
    (f < focalRange.min * (1 - FOCAL_RANGE_TOLERANCE) ||
      f > focalRange.max * (1 + FOCAL_RANGE_TOLERANCE))
  )
    notes.push({
      code: "focalOutOfRange",
      values: { focal: f, focalMin: focalRange.min, focalMax: focalRange.max },
    });
  if (hfov / DEG > WIDE_ANGLE_DEG)
    notes.push({ code: "wideAngle", values: { hfov: hfov / DEG } });
  if (zone.tilt / DEG > TOP_VIEW_TILT_DEG && zone.x1 < 0)
    notes.push({ code: "topView", values: {} });
  const lowestRayAngle = Math.atan2(
    context.Hc,
    Math.max(Math.abs(zone.x1), Math.abs(zone.x2)),
  );
  if (lowestRayAngle / DEG < LOW_RAY_DEG)
    notes.push({ code: "lowRay", values: { angle: lowestRayAngle / DEG } });
  if (context.analyticsFpsSet > context.fps)
    notes.push({
      code: "analyticsFps",
      values: { analyticsFps: context.analyticsFpsSet, streamFps: context.fps },
    });
  return notes;
}

// фокус упёрся в предел объектива в режиме подбора
export const isClamped = ({ f, fNeeded }: LensFit) =>
  fNeeded !== null && Math.abs(fNeeded - f) > FOCAL_CLAMP_NOTE_MM;

type Assessment = { verdict: Verdict; status: ObjectStatus; notes: Note[] };

// вердикт по объектам; к замечаниям сцены добавляются советы по объектам, которые не проходят:
// нехватка разрешения — первой, потеря пикселей при уменьшении до входа — последними
export function assessObjects(
  objects: ObjectResult[],
  sceneNotes: Note[],
): Assessment {
  const valid = objects.filter((result): result is ValidObject => result.valid);
  const failing = valid.filter((result) => result.status === "bad"),
    marginal = valid.filter((result) => result.status === "warn");
  if (!valid.length)
    return {
      verdict: { code: "noObjects" },
      status: "warn",
      notes: sceneNotes,
    };
  if (failing.length) {
    const downscale: Note[] = failing
      .filter((result) => result.sensorOk)
      .map((result) => ({
        code: "downscale",
        values: {
          object: result,
          neededInputSize:
            Math.ceil(
              (result.feed.inputSize * result.requiredPx) /
                result.modelPx /
                INPUT_SIZE_STEP,
            ) * INPUT_SIZE_STEP,
        },
      }));
    const lowResolution = failing.filter((result) => !result.sensorOk);
    const resolution: Note[] = lowResolution.length
      ? [
          resolutionNote(
            lowResolution.reduce((a, b) =>
              a.minSensorWidthPx > b.minSensorWidthPx ? a : b,
            ),
          ),
        ]
      : [];
    return {
      verdict: {
        code: "bad",
        objects: failing,
      },
      status: "bad",
      notes: [...resolution, ...sceneNotes, ...downscale],
    };
  }
  if (marginal.length)
    return {
      verdict: {
        code: "warn",
        objects: marginal,
      },
      status: "warn",
      notes: sceneNotes,
    };
  const smallest = valid.reduce((a, b) => (a.modelPx < b.modelPx ? a : b));
  return {
    verdict: { code: "ok", object: smallest },
    status: sceneNotes.length ? "warn" : "ok",
    notes: sceneNotes,
  };
}

// наименьшее разрешение из списка, при котором объекту хватит пикселей на матрице
function resolutionNote(object: ValidObject): Note {
  const resolution = RESOLUTIONS.find(
    ({ width }) => width >= object.minSensorWidthPx,
  );
  return resolution
    ? { code: "resolution", values: { object, resolution } }
    : { code: "resolutionNone", values: { object } };
}
