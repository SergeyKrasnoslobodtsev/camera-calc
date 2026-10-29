// Карточка объекта: размеры, порог, модель и подача кадра; под полями — результат объекта.
import type { ChangeEvent } from "react";
import { STR, displayName, formatNumber, t } from "../../../i18n/index.ts";
import {
  feedText,
  modelPxText,
  sensorPxText,
} from "../../../i18n/domain-text.ts";
import type { ObjectResult } from "../../../domain/compute-type/index.ts";
import { MODELS } from "../../../domain/references/models.ts";
import {
  deleteObject,
  state,
  updateObject,
  type ObjectDraft,
} from "../../../app/store.ts";
import { Field } from "../../components/Field.tsx";
import { NumberInput } from "../../components/NumberInput.tsx";
import { MODEL_INPUT_SIZES } from "../../lib/model-input-sizes.ts";

type ObjectField = Exclude<keyof ObjectDraft, "nameKey">;
type CardProps = {
  index: number;
  object: ObjectDraft;
  result: ObjectResult | undefined; // нет — расчёт типа не выполнен
};

export function ObjectCard({ index, object, result }: CardProps) {
  const id = (name: string) => `${name}-${index}`;
  const bind = (field: ObjectField, idPrefix: string) => ({
    id: id(idPrefix),
    value: String(object[field]),
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      updateObject(index, field, event.target.value),
  });
  const status = result?.valid ? result.status : "";

  return (
    <article className="ocard">
      <div className="ohdr">
        <span className={`dot ${status}`.trim()} aria-hidden="true" />
        <input
          id={id("objectName")}
          aria-label={t("objectName")}
          value={displayName(object)}
          onChange={(event) => updateObject(index, "name", event.target.value)}
        />
        <button
          type="button"
          className="odel"
          aria-label={t("objectDelete")}
          onClick={() => deleteObject(index)}
        >
          ×
        </button>
      </div>
      <div className="ogrid">
        <Field id={id("objectWidth")} label={t("objectWidth")}>
          <NumberInput {...bind("width", "objectWidth")} />
        </Field>
        <Field id={id("objectLength")} label={t("objectLength")}>
          <NumberInput {...bind("length", "objectLength")} />
        </Field>
        <Field id={id("objectHeight")} label={t("objectHeight")}>
          <NumberInput {...bind("height", "objectHeight")} />
        </Field>
        <Field id={id("objectRequired")} label={t("objectRequiredPx")}>
          <NumberInput {...bind("requiredPx", "objectRequired")} />
        </Field>
        <Field id={id("objectModel")} label={t("objectModel")} span="c2">
          <select {...bind("model", "objectModel")}>
            <optgroup label={t("ultralytics")}>
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </optgroup>
            {state.customDetectors.length > 0 && (
              <optgroup label={t("customDetectors")}>
                {state.customDetectors.map((detector) => (
                  <option key={detector.id} value={detector.id}>
                    {detector.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
        <Field id={id("objectFeed")} label={t("objectFeed")}>
          <select {...bind("feed", "objectFeed")}>
            {Object.entries(STR.feeds).map(([feed, label]) => (
              <option key={feed} value={feed}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={id("objectInput")} label={t("objectInput")}>
          <select
            {...bind("inputSize", "objectInput")}
            style={{ fontFamily: "var(--mono)" }}
          >
            {MODEL_INPUT_SIZES.map((size) => (
              <option key={size}>{size}</option>
            ))}
          </select>
        </Field>
        {/* перекрытие задаётся только для тайлов */}
        <Field
          id={id("objectOverlap")}
          label={t("objectOverlap")}
          hidden={object.feed !== "tiles"}
        >
          <NumberInput {...bind("overlap", "objectOverlap")} />
        </Field>
      </div>
      <ObjectResultLine id={id("objectResult")} result={result} />
    </article>
  );
}

const capitalize = (text: string) =>
  text ? text[0].toUpperCase() + text.slice(1) : text;
// метка, на место которой в тексте словаря встаёт элемент
const SLOT = "\u0000";

function ObjectResultLine({
  id,
  result,
}: {
  id: string;
  result: ObjectResult | undefined;
}) {
  if (!result) return <div className="ores" id={id} aria-live="polite" />;
  if (!result.valid)
    return (
      <div className="ores" id={id} aria-live="polite">
        {t("objectInvalid")}
      </div>
    );
  const [beforePx, afterPx] = t(
    "objectAtModel",
    SLOT,
    formatNumber(result.requiredPx, 0),
  ).split(SLOT);
  return (
    <div className={`ores ${result.status}`} id={id} aria-live="polite">
      <b>{capitalize(STR.status[result.status])}</b>
      <span>
        {beforePx}
        <span className="mono">{modelPxText(result)}</span>
        {afterPx}
      </span>
      <span className="m2">
        {t("objectAtSensor", sensorPxText(result), feedText(result.feed))}
      </span>
    </div>
  );
}
