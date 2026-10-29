// Форма своей модели: скорость, замеренная на одном GPU, разбор и проверка — parseModel из domain.
import { useState, type ChangeEvent } from "react";
import { t } from "../../i18n/index.ts";
import { parseModel } from "../../domain/entities/model.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { uid } from "../../app/examples.ts";
import { addModel, allGpus, gpuById } from "../../app/store.ts";
import { Field } from "../components/Field.tsx";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { useComputed } from "../hooks/useComputed.ts";
import { MODEL_INPUT_SIZES } from "../lib/model-input-sizes.ts";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { TemplateForm } from "./TemplateForm.tsx";

const DEFAULT_INPUT_SIZE = "640";
const DEFAULT_REF_GPU = "5090";

const MODEL_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  fps: "errorFps",
  gflops: "errorGflops",
};

// текстовые поля; после добавления модели очищаются, вход и GPU замера остаются
type ModelDraft = Record<"name" | "fps" | "gflops", string>;
const EMPTY_DRAFT: ModelDraft = { name: "", fps: "", gflops: "" };

export function ModelForm() {
  // список GPU замера — из state
  useComputed();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [inputSize, setInputSize] = useState(DEFAULT_INPUT_SIZE);
  const [chosenRefGpu, setRefGpu] = useState(DEFAULT_REF_GPU);
  const [error, setError] = useState("");
  // выбранная карта могла быть удалена на экране видеокарт
  const refGpu = gpuById(chosenRefGpu) ? chosenRefGpu : DEFAULT_REF_GPU;

  const bind = (field: keyof ModelDraft, id: string) => ({
    id,
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [field]: event.target.value }),
  });

  const submit = () => {
    const gflops = parseNum(draft.gflops);
    const parsed = parseModel({
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
        t("cameraFormError", formErrorText(parsed.errors, MODEL_FORM_ERRORS)),
      );
      return;
    }
    setError("");
    addModel(parsed.value);
    setDraft(EMPTY_DRAFT);
    toast(t("modelAdded", parsed.value.name));
  };

  return (
    <TemplateForm
      id="modelForm"
      title={t("modelFormTitle")}
      hint={[t("hintHow"), t("modelFormHint1"), t("modelFormHint2")]}
      error={error}
      submitLabel={t("addModelBtn")}
      onSubmit={submit}
    >
      <Field id="modelFormName" label={t("typeName")} span="full">
        <input
          {...bind("name", "modelFormName")}
          placeholder={t("modelFormNamePlaceholder")}
          style={{ fontFamily: "var(--sans)" }}
        />
      </Field>
      <Field id="modelFormFps" label={t("modelFormFps")} tip="modelFormFps">
        <NumberInput
          {...bind("fps", "modelFormFps")}
          placeholder={t("modelFormFpsPlaceholder")}
        />
      </Field>
      <Field id="modelFormInput" label={t("modelFormInput")}>
        <select
          id="modelFormInput"
          value={inputSize}
          onChange={(event) => setInputSize(event.target.value)}
          style={{ fontFamily: "var(--mono)" }}
        >
          {MODEL_INPUT_SIZES.map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </Field>
      <Field id="modelFormRefGpu" label={t("modelFormRefGpu")} span="full">
        <select
          id="modelFormRefGpu"
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
      <Field id="modelFormGflops" label={t("modelFormGflops")} span="full">
        <NumberInput
          {...bind("gflops", "modelFormGflops")}
          placeholder={t("modelFormGflopsPlaceholder")}
        />
      </Field>
    </TemplateForm>
  );
}
