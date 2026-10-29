// Форма активного типа камер: значения полей — из состояния, ввод сразу меняет тип через store.
import type { ChangeEvent, ReactNode } from "react";
import type { STR } from "../../../i18n/index.ts";
import { displayName, formatNumber, t, withUnit } from "../../../i18n/index.ts";
import { resolutionLabel } from "../../../i18n/domain-text.ts";
import type { Camera } from "../../../domain/entities/camera.ts";
import { parseNum } from "../../../domain/parse-num.ts";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from "../../../domain/references/resolutions.ts";
import { DEFAULT_SENSOR, SENSORS } from "../../../domain/references/sensors.ts";
import {
  activeType,
  allCameras,
  cameraById,
  deleteActiveType,
  duplicateActiveType,
  state,
  updateActiveType,
  type TypeDraft,
  type TypeOutcome,
} from "../../../app/store.ts";
import { Field } from "../../components/Field.tsx";
import { NumberInput } from "../../components/NumberInput.tsx";
import { Tip } from "../../components/Tip.tsx";
import { useComputed } from "../../hooks/useComputed.ts";
import { useConfirm } from "../../hooks/useConfirm.ts";
import { toast } from "../../toast.ts";

type Inputs = TypeDraft["inputs"];
type InputName = keyof Inputs;

const sensorLabel = (sensor: (typeof SENSORS)[number]) =>
  sensor.kind === "format"
    ? t("sensorFormat", sensor.format, formatNumber(sensor.widthMm, 1))
    : sensor.kind === "pixelPitch"
      ? t("sensorByPixelPitch")
      : t("sensorCustom");

// сводки в заголовках секций: видны, когда секция свёрнута
function sectionSummaries(
  inputs: Inputs,
  camera: Camera | undefined,
  result: TypeOutcome,
) {
  const meters = (value: string) =>
    withUnit(formatNumber(parseNum(value), 1), "m");
  const frame = camera
    ? `${camera.Nw} × ${camera.Nh}`
    : t(
        "megapixels",
        (RESOLUTIONS[+inputs.resolution] ?? DEFAULT_RESOLUTION).megapixels,
      );
  const focal = result.ok
    ? `, f ${withUnit(formatNumber(result.lens.f, 1), "mm")}`
    : "";
  return {
    geometry: `${t(inputs.placement === "top" ? "summaryTop" : "summarySide")}, ${meters(inputs.cameraHeight)}, ${formatNumber(parseNum(inputs.zoneWidth), 1)} × ${meters(inputs.zoneDepth)}`,
    camera: frame + focal,
    stream: `${withUnit(formatNumber(parseNum(inputs.fps), 0), "fps")}, ${inputs.codec === "0.04" ? "H.265" : "H.264"}`,
  };
}

export function TypeForm() {
  const { results } = useComputed();
  const type = activeType();
  const result = results[state.cameraTypes.indexOf(type)];
  const { inputs } = type;
  const camera = cameraById(inputs.camera);
  const sensor = SENSORS[+inputs.sensor] ?? DEFAULT_SENSOR;
  // ширина матрицы из камеры или по формату рассчитана domain; своя — как введена
  const sensorWidthReadOnly = !!camera || sensor.kind !== "custom";
  const computedSensorWidth =
    "frame" in result ? result.frame.sensorWidth : NaN;
  const sensorWidth =
    sensorWidthReadOnly && isFinite(computedSensorWidth)
      ? String(+computedSensorWidth.toFixed(2))
      : inputs.sensorWidth;
  const summary = sectionSummaries(inputs, camera, result);

  const setInput = (name: InputName, value: string) =>
    updateActiveType({
      count: String(type.count),
      inputs: { ...inputs, [name]: value },
    });
  const bind = (name: InputName) => ({
    id: name,
    value: inputs[name],
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setInput(name, event.target.value),
  });

  const duplicate = () => {
    duplicateActiveType(displayName(type) + t("copySuffix"));
    toast(t("typeCopied"));
  };
  const remove = useConfirm(() => {
    deleteActiveType();
    toast(t("typeDeleted"));
  });

  return (
    <form
      className="panel col"
      id="typeForm"
      autoComplete="off"
      aria-labelledby="parametersTitle"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="colhead typehead">
        <h2 id="parametersTitle">{t("parametersTitle")}</h2>
        <Field id="typeName" label={t("typeName")} tip="typeName">
          <input
            id="typeName"
            value={displayName(type)}
            onChange={(event) =>
              updateActiveType({
                name: event.target.value,
                count: String(type.count),
                inputs,
              })
            }
          />
        </Field>
        <Field id="typeCount" label={t("typeCount")} tip="typeCount">
          <NumberInput
            integer
            id="typeCount"
            value={type.count}
            onChange={(event) =>
              updateActiveType({ count: event.target.value, inputs })
            }
          />
        </Field>
      </div>

      <Section title={t("sectionGeometry")} summary={summary.geometry} open>
        <Field id="cameraHeight" label={t("cameraHeight")} tip="cameraHeight">
          <NumberInput {...bind("cameraHeight")} />
        </Field>
        <Field id="planeHeight" label={t("planeHeight")} tip="planeHeight">
          <NumberInput {...bind("planeHeight")} />
        </Field>
        <Field
          id="zoneStart"
          label={t("zoneStart")}
          tip="zoneStart"
          hidden={inputs.placement === "top"}
        >
          <NumberInput {...bind("zoneStart")} />
        </Field>
        <Field id="margin" label={t("margin")} tip="margin">
          <NumberInput {...bind("margin")} />
        </Field>
        <Field id="zoneDepth" label={t("zoneDepth")} tip="zoneDepth">
          <NumberInput {...bind("zoneDepth")} />
        </Field>
        <Field id="zoneWidth" label={t("zoneWidth")} tip="zoneWidth">
          <NumberInput {...bind("zoneWidth")} />
        </Field>
        <Choice
          name="placement"
          label={t("placement")}
          ariaLabel={t("placement")}
          value={inputs.placement}
          options={[
            ["side", t("placementSide")],
            ["top", t("placementTop")],
          ]}
          onChange={(value) => setInput("placement", value)}
        />
      </Section>

      <Section title={t("sectionCamera")} summary={summary.camera} open>
        <div className="f full">
          <div className="lrow" style={{ justifyContent: "space-between" }}>
            <div className="lrow">
              <label htmlFor="camera">{t("cameraSelect")}</label>
              <Tip field="camera" />
            </div>
            <a className="inlink" href="#tpl-cams">
              {t("addCameraLink")}
            </a>
          </div>
          <select {...bind("camera")}>
            <option value="">{t("cameraManual")}</option>
            {allCameras().map((option) => (
              <option key={option.id} value={option.id}>
                {displayName(option)}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="resolution"
          label={t("resolution")}
          tip="resolution"
          span="full"
        >
          <select {...bind("resolution")} disabled={!!camera}>
            {RESOLUTIONS.map((resolution, i) => (
              <option key={i} value={i}>
                {resolutionLabel(resolution)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="sensor" label={t("sensor")} tip="sensor">
          <select {...bind("sensor")} disabled={!!camera}>
            {SENSORS.map((option, i) => (
              <option key={i} value={i}>
                {sensorLabel(option)}
              </option>
            ))}
          </select>
        </Field>
        <Field id="sensorWidth" label={t("sensorWidth")} tip="sensorWidth">
          <NumberInput
            {...bind("sensorWidth")}
            value={sensorWidth}
            readOnly={sensorWidthReadOnly}
          />
        </Field>
        <Field
          id="pixelPitch"
          label={t("pixelPitch")}
          tip="pixelPitch"
          span="full"
          hidden={!!camera || sensor.kind !== "pixelPitch"}
        >
          <NumberInput {...bind("pixelPitch")} />
        </Field>
        <Field
          id="orientation"
          label={t("orientation")}
          tip="orientation"
          span="full"
        >
          <select {...bind("orientation")}>
            <option value="auto">{t("auto")}</option>
            <option value="landscape">{t("orientationLandscape")}</option>
            <option value="portrait">{t("orientationPortrait")}</option>
          </select>
        </Field>
        <Choice
          name="lensMode"
          label={t("lensMode")}
          ariaLabel={t("lensModeAria")}
          value={inputs.lensMode}
          options={[
            ["auto", t("lensModeAuto")],
            ["focal", t("lensModeFocal")],
            ["angle", t("lensModeAngle")],
          ]}
          onChange={(value) => setInput("lensMode", value)}
        />
        <Field
          id="focalLength"
          label={t("focalLength")}
          tip="focalLength"
          hidden={inputs.lensMode !== "focal"}
        >
          <NumberInput {...bind("focalLength")} />
        </Field>
        <Field
          id="hfov"
          label={t("hfov")}
          tip="hfov"
          hidden={inputs.lensMode !== "angle"}
        >
          <NumberInput {...bind("hfov")} />
        </Field>
      </Section>

      <Section title={t("sectionStream")} summary={summary.stream}>
        <Field id="fps" label={t("fps")} tip="fps">
          <NumberInput {...bind("fps")} />
        </Field>
        <Field id="analyticsFps" label={t("analyticsFps")} tip="analyticsFps">
          <NumberInput {...bind("analyticsFps")} />
        </Field>
        <Field id="codec" label={t("codec")} tip="codec">
          <select {...bind("codec")}>
            <option value="0.04">H.265</option>
            <option value="0.07">H.264</option>
          </select>
        </Field>
        <Field id="scene" label={t("scene")} tip="scene">
          <select {...bind("scene")}>
            <option value="0.6">{t("sceneLow")}</option>
            <option value="1">{t("sceneMid")}</option>
            <option value="1.5">{t("sceneHigh")}</option>
          </select>
        </Field>
        <Field id="lensFactor" label={t("lensFactor")} tip="lensFactor">
          <NumberInput {...bind("lensFactor")} />
        </Field>
        <Field id="speed" label={t("speed")} tip="speed">
          <NumberInput {...bind("speed")} />
        </Field>
        <Field id="blurPx" label={t("blurPx")} tip="blurPx">
          <NumberInput {...bind("blurPx")} />
        </Field>
      </Section>

      <div className="colfoot">
        <button
          type="button"
          className="sm"
          id="duplicateTypeBtn"
          onClick={duplicate}
        >
          {t("duplicateTypeBtn")}
        </button>
        <button
          type="button"
          className="sm danger"
          id="deleteTypeBtn"
          onClick={() =>
            state.cameraTypes.length < 2 ? toast(t("lastType")) : remove.click()
          }
        >
          {t(remove.confirming ? "deleteTypeConfirm" : "deleteTypeBtn")}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  summary,
  open = false,
  children,
}: {
  title: string;
  summary: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="sec" open={open}>
      <summary>
        <span>{title}</span> <span className="sumv">{summary}</span>
      </summary>
      <div className="fs">{children}</div>
    </details>
  );
}

// переключатель из нескольких вариантов; подсказка — по имени поля
function Choice<Value extends string>({
  name,
  label,
  ariaLabel,
  value,
  options,
  onChange,
}: {
  name: InputName & keyof typeof STR.tips;
  label: string;
  ariaLabel: string;
  value: string;
  options: [Value, string][];
  onChange: (value: Value) => void;
}) {
  return (
    <div className="f full">
      <div className="lrow">
        <span>{label}</span>
        <Tip field={name} />
      </div>
      <div
        className={options.length === 3 ? "seg three" : "seg"}
        role="radiogroup"
        aria-label={ariaLabel}
      >
        {options.map(([option, text]) => (
          <label key={option}>
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
