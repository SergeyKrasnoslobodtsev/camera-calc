// Форма своего детектора: скорость, замеренная на одном GPU, разбор и проверка — parseDetector из domain.
import { useState, type ChangeEvent } from "react";
import { t } from "../../i18n/index.ts";
import { parseDetector } from "../../domain/entities/detector.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { uid } from "../../app/examples.ts";
import { addDetector, allGpus, gpuById } from "../../app/store.ts";
import { Field } from "../components/Field.tsx";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { MODEL_INPUT_SIZES } from "../lib/model-input-sizes.ts";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { TemplateForm } from "./TemplateForm.tsx";

const DEFAULT_INPUT_SIZE = "640";
const DEFAULT_REF_GPU = "5090";

const DETECTOR_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  fps: "errorFps",
  gflops: "errorGflops",
};

// текстовые поля; после добавления детектора очищаются, вход и GPU замера остаются
type DetectorDraft = Record<"name" | "fps" | "gflops", string>;
const EMPTY_DRAFT: DetectorDraft = { name: "", fps: "", gflops: "" };

export function DetectorForm() {
  // список GPU замера — из state
  useComputed();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [inputSize, setInputSize] = useState(DEFAULT_INPUT_SIZE);
  const [chosenRefGpu, setRefGpu] = useState(DEFAULT_REF_GPU);
  const [error, setError] = useState("");
  // выбранная карта могла быть удалена на экране видеокарт
  const refGpu = gpuById(chosenRefGpu) ? chosenRefGpu : DEFAULT_REF_GPU;

  const bind = (field: keyof DetectorDraft, id: string) => ({
    id,
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [field]: event.target.value }),
  });

  const submit = () => {
    const gflops = parseNum(draft.gflops);
    const parsed = parseDetector({
      id: "d" + uid(),
      name: draft.name.trim(),
      fps: parseNum(draft.fps),
      inputSize: +inputSize,
      refGpu,
      gflops: isNaN(gflops) ? 0 : gflops,
      custom: true,
    });
    if (!parsed.ok) {
      setError(
        t(
          "cameraFormError",
          formErrorText(parsed.errors, DETECTOR_FORM_ERRORS),
        ),
      );
      return;
    }
    setError("");
    addDetector(parsed.value);
    setDraft(EMPTY_DRAFT);
    toast(t("detectorAdded", parsed.value.name));
  };

  return (
    <TemplateForm
      id="detectorForm"
      title={t("detectorFormTitle")}
      hint={[t("hintHow"), t("detectorFormHint1"), t("detectorFormHint2")]}
      error={error}
      submitLabel={t("addDetectorBtn")}
      onSubmit={submit}
    >
      <Field id="detectorFormName" label={t("typeName")} span="full">
        <input
          {...bind("name", "detectorFormName")}
          placeholder={t("detectorFormNamePlaceholder")}
          style={{ fontFamily: "var(--sans)" }}
        />
      </Field>
      <Field
        id="detectorFormFps"
        label={t("detectorFormFps")}
        tip="detectorFormFps"
      >
        <NumberInput
          {...bind("fps", "detectorFormFps")}
          placeholder={t("detectorFormFpsPlaceholder")}
        />
      </Field>
      <Field id="detectorFormInput" label={t("detectorFormInput")}>
        <select
          id="detectorFormInput"
          value={inputSize}
          onChange={(event) => setInputSize(event.target.value)}
          style={{ fontFamily: "var(--mono)" }}
        >
          {MODEL_INPUT_SIZES.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </Field>
      <Field
        id="detectorFormRefGpu"
        label={t("detectorFormRefGpu")}
        span="full"
      >
        <select
          id="detectorFormRefGpu"
          value={refGpu}
          onChange={(event) => setRefGpu(event.target.value)}
        >
          {allGpus().map((gpu) => (
            <option key={gpu.id} value={gpu.id}>
              {gpu.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="detectorFormGflops"
        label={t("detectorFormGflops")}
        span="full"
      >
        <NumberInput
          {...bind("gflops", "detectorFormGflops")}
          placeholder={t("detectorFormGflopsPlaceholder")}
        />
      </Field>
    </TemplateForm>
  );
}
