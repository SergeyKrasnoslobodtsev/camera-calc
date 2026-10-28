// Тексты для результатов domain: заметки, вердикт, подача, разрешение.
// Из domain берутся только типы (import type), в сборку его код отсюда не попадает.
import type {
  Feed,
  Note,
  ObjectResult,
  ValidObject,
  Verdict,
} from "../domain/compute-type/index.ts";
import type { Resolution } from "../domain/references/resolutions.ts";
import { formatNumber, t } from "./index.ts";

export const resolutionLabel = ({ megapixels, width, height }: Resolution) =>
  `${t("megapixels", megapixels)} · ${width} × ${height}`;

export const objectName = ({ object }: ObjectResult) =>
  object.name || t("objDefault");

const sizePx = (width: number, height: number) =>
  `${formatNumber(width, 1)} × ${formatNumber(height, 1)}\u00a0px`;

// рамка объекта на матрице и на входе модели
export const sensorPxText = ({ widthPx, heightPx }: ValidObject) =>
  sizePx(widthPx, heightPx);
export const modelPxText = ({ widthPx, heightPx, feed }: ValidObject) =>
  sizePx(widthPx * feed.modelScale, heightPx * feed.modelScale);

export function feedText({
  mode,
  inputSize,
  source,
  tiles,
  tilesX,
  tilesY,
}: Feed) {
  if (mode === "tiles") return t("feedTiles", tiles, tilesX, tilesY, inputSize);
  return t(
    mode === "roi" ? "feedRoi" : "feedFull",
    Math.round(source.width),
    Math.round(source.height),
    inputSize,
  );
}

export function noteText(note: Note): string {
  switch (note.code) {
    case "zoneWidth":
      return t(
        "noteZoneWidth",
        formatNumber(note.values.frameWidth, 2),
        formatNumber(note.values.zoneWidth, 2),
      );
    case "zoneDepth":
      return t(
        "noteZoneDepth",
        formatNumber(note.values.requiredAngle, 1),
        formatNumber(note.values.availableAngle, 1),
      );
    case "focalMax":
    case "focalMin":
      return t(
        note.code === "focalMax" ? "noteFocalMax" : "noteFocalMin",
        formatNumber(note.values.requiredFocal, 1),
        formatNumber(note.values.focal, 1),
      );
    case "focalOutOfRange": {
      const { focal, focalMin, focalMax } = note.values;
      return t(
        "noteFocalOutOfRange",
        formatNumber(focal, 1),
        focalMin === focalMax
          ? formatNumber(focalMin, 1)
          : formatNumber(focalMin, 1) + "–" + formatNumber(focalMax, 1),
      );
    }
    case "wideAngle":
      return t("noteWideAngle", formatNumber(note.values.hfov, 0));
    case "topView":
      return t("noteTopView");
    case "lowRay":
      return t("noteLowRay", formatNumber(note.values.angle, 0));
    case "analyticsFps":
      return t(
        "noteAnalyticsFps",
        formatNumber(note.values.analyticsFps, 0),
        formatNumber(note.values.streamFps, 0),
      );
    case "downscale": {
      const { object, neededInputSize } = note.values;
      return t(
        "noteDownscale",
        object.object.name,
        sensorPxText(object),
        object.feed.inputSize,
        t(
          object.feed.mode === "full"
            ? "adviceFull"
            : object.feed.mode === "roi"
              ? "adviceRoi"
              : "adviceTiles",
        ),
        formatNumber(neededInputSize, 0),
      );
    }
    case "resolution":
      return t(
        "noteResolution",
        note.values.object.object.name,
        formatNumber(note.values.object.minSensorWidthPx, 0),
        resolutionLabel(note.values.resolution),
      );
    case "resolutionNone":
      return t(
        "noteResolutionNone",
        note.values.object.object.name,
        formatNumber(note.values.object.minSensorWidthPx, 0),
      );
  }
}

const verdictItems = (objects: ValidObject[]) =>
  objects
    .map((result) =>
      t(
        "verdictItem",
        objectName(result),
        modelPxText(result),
        formatNumber(result.requiredPx, 0),
      ),
    )
    .join("; ");

export function verdictHeadline(verdict: Verdict) {
  switch (verdict.code) {
    case "noObjects":
      return t("verdictNoObjects");
    case "bad":
      return t("verdictBad", verdictItems(verdict.objects));
    case "warn":
      return t("verdictWarn", verdictItems(verdict.objects));
    case "ok":
      return t(
        "verdictOk",
        verdict.object.object.name,
        modelPxText(verdict.object),
      );
  }
}

// плашка вердикта; при замечаниях «достаточно» заменяется на «есть замечания»
export function verdictPill(verdict: Verdict, notes: Note[]) {
  switch (verdict.code) {
    case "noObjects":
      return t("pillNoObjects");
    case "bad":
      return t("pillBad");
    case "warn":
      return t("pillWarn");
    case "ok":
      return t(notes.length ? "pillCheck" : "pillOk");
  }
}
