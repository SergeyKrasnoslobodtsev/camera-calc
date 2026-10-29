// Форма своей камеры: поля как введены, разбор и проверка — parseCamera из domain.
import { useState, type ChangeEvent } from "react";
import { displayName, t } from "../../i18n/index.ts";
import { parseCamera } from "../../domain/entities/camera.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { uid } from "../../app/examples.ts";
import { addCamera } from "../../app/store.ts";
import { Field } from "../components/Field.tsx";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { TemplateForm } from "./TemplateForm.tsx";

const CAMERA_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  Nw: "errorFrame",
  Nh: "errorFrame",
  sensorWidth: "errorSensorWidth",
  focalMin: "errorFocal",
  focalMax: "errorFocalRange",
  price: "errorCameraPrice",
};

type CameraDraft = Record<
  | "name"
  | "width"
  | "height"
  | "sensorWidth"
  | "pixelPitch"
  | "focalMin"
  | "focalMax"
  | "price",
  string
>;
const EMPTY_DRAFT: CameraDraft = {
  name: "",
  width: "",
  height: "",
  sensorWidth: "",
  pixelPitch: "",
  focalMin: "",
  focalMax: "",
  price: "",
};

// ширина матрицы не задана — по размеру пикселя; задан один край фокуса — объектив с постоянным фокусом
function cameraFromDraft(draft: CameraDraft) {
  const Nw = parseNum(draft.width);
  const pixelPitchUm = parseNum(draft.pixelPitch);
  let sensorWidth = parseNum(draft.sensorWidth);
  if (isNaN(sensorWidth) && pixelPitchUm > 0 && Nw > 0)
    sensorWidth = +((pixelPitchUm * Nw) / 1000).toFixed(3);
  let focalMin = parseNum(draft.focalMin);
  let focalMax = parseNum(draft.focalMax);
  if (focalMin > 0 && isNaN(focalMax)) focalMax = focalMin;
  if (focalMax > 0 && isNaN(focalMin)) focalMin = focalMax;
  const price = parseNum(draft.price);
  return {
    id: "m" + uid(),
    name: draft.name.trim(),
    Nw,
    Nh: parseNum(draft.height),
    sensorWidth,
    focalMin: isNaN(focalMin) ? 0 : focalMin,
    focalMax: isNaN(focalMax) ? 0 : focalMax,
    price: isNaN(price) ? 0 : price,
    custom: true,
  };
}

export function CameraForm() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState("");

  const bind = (field: keyof CameraDraft, id: string) => ({
    id,
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [field]: event.target.value }),
  });

  const submit = () => {
    const parsed = parseCamera(cameraFromDraft(draft));
    if (!parsed.ok) {
      setError(
        t("cameraFormError", formErrorText(parsed.errors, CAMERA_FORM_ERRORS)),
      );
      return;
    }
    setError("");
    addCamera(parsed.value);
    setDraft(EMPTY_DRAFT);
    toast(t("cameraAdded", displayName(parsed.value)));
  };

  return (
    <TemplateForm
      id="cameraForm"
      title={t("cameraFormTitle")}
      hint={[t("hintWhere"), t("cameraFormHint1"), t("cameraFormHint2")]}
      error={error}
      submitLabel={t("addCameraBtn")}
      onSubmit={submit}
    >
      <Field id="cameraFormName" label={t("typeName")} span="full">
        <input
          {...bind("name", "cameraFormName")}
          placeholder={t("cameraFormNamePlaceholder")}
          style={{ fontFamily: "var(--sans)" }}
        />
      </Field>
      <Field id="cameraFormWidth" label={t("cameraFormWidth")}>
        <NumberInput
          integer
          {...bind("width", "cameraFormWidth")}
          placeholder="2560"
        />
      </Field>
      <Field id="cameraFormHeight" label={t("cameraFormHeight")}>
        <NumberInput
          integer
          {...bind("height", "cameraFormHeight")}
          placeholder="1440"
        />
      </Field>
      <Field
        id="cameraFormSensorWidth"
        label={t("cameraFormSensorWidth")}
        tip="cameraFormSensorWidth"
      >
        <NumberInput
          {...bind("sensorWidth", "cameraFormSensorWidth")}
          placeholder="5.4"
        />
      </Field>
      <Field id="cameraFormPixelPitch" label={t("cameraFormPixelPitch")}>
        <NumberInput
          {...bind("pixelPitch", "cameraFormPixelPitch")}
          placeholder="2.0"
        />
      </Field>
      <Field id="cameraFormFocalMin" label={t("cameraFormFocalMin")}>
        <NumberInput
          {...bind("focalMin", "cameraFormFocalMin")}
          placeholder="2.8"
        />
      </Field>
      <Field id="cameraFormFocalMax" label={t("cameraFormFocalMax")}>
        <NumberInput
          {...bind("focalMax", "cameraFormFocalMax")}
          placeholder="12"
        />
      </Field>
      <Field id="cameraFormPrice" label={t("cameraFormPrice")}>
        <NumberInput
          integer
          {...bind("price", "cameraFormPrice")}
          placeholder={t("optional")}
        />
      </Field>
    </TemplateForm>
  );
}
