// Форма своей видеокарты: поля как введены, разбор и проверка — parseGpu из domain.
import { useState, type ChangeEvent } from "react";
import { t } from "../../i18n/index.ts";
import { parseGpu } from "../../domain/entities/gpu.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { uid } from "../../app/examples.ts";
import { addGpu } from "../../app/store.ts";
import { Field } from "../components/Field.tsx";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { TemplateForm } from "./TemplateForm.tsx";

const ARCHITECTURES = ["Blackwell", "Hopper", "Ada", "Ampere", "Turing"];
const JETSON = "jet";
// потоки H.264 у Jetson — по отношению H.264 к H.265 у NVDEC Ampere: 748 к 1415 к/с (NVDEC_FPS в domain)
const JETSON_H264_PER_H265 = 748 / 1415;

const GPU_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  tflops: "errorTflops",
  nvdec: "errorDecoders",
  "decodeStreams.h264": "errorDecoderStreams",
  "decodeStreams.h265": "errorDecoderStreams",
  memoryGB: "errorMemory",
  tdpW: "errorTdp",
  price: "errorPrice",
};

// текстовые поля; после добавления карты очищаются, архитектура и участие в подборе остаются
type GpuDraft = Record<
  "name" | "tflops" | "decoders" | "memory" | "tdp" | "price",
  string
>;
const EMPTY_DRAFT: GpuDraft = {
  name: "",
  tflops: "",
  decoders: "",
  memory: "",
  tdp: "",
  price: "",
};

// decoders — число NVDEC, у Jetson — потоков 1080p30 H.265
function gpuFromDraft(draft: GpuDraft, architecture: string) {
  const decoders = parseNum(draft.decoders);
  const tdpW = parseNum(draft.tdp);
  return {
    id: "c" + uid(),
    name: draft.name.trim(),
    arch: architecture === JETSON ? "Ampere" : architecture,
    tflops: parseNum(draft.tflops),
    ...(architecture === JETSON
      ? {
          jetson: true,
          decodeStreams: {
            h264: +(decoders * JETSON_H264_PER_H265).toFixed(1),
            h265: decoders,
          },
        }
      : { nvdec: decoders }),
    memoryGB: parseNum(draft.memory),
    tdpW: isNaN(tdpW) ? 0 : tdpW,
    price: parseNum(draft.price),
    custom: true,
  };
}

export function GpuForm() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [architecture, setArchitecture] = useState(ARCHITECTURES[0]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState("");
  const isJetson = architecture === JETSON;

  const bind = (field: keyof GpuDraft, id: string) => ({
    id,
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [field]: event.target.value }),
  });

  const submit = () => {
    const parsed = parseGpu(gpuFromDraft(draft, architecture));
    if (!parsed.ok) {
      setError(
        t("gpuFormError", formErrorText(parsed.errors, GPU_FORM_ERRORS)),
      );
      return;
    }
    setError("");
    addGpu(parsed.value, enabled);
    setDraft(EMPTY_DRAFT);
    toast(t("gpuAdded", parsed.value.name));
  };

  return (
    <TemplateForm
      id="gpuForm"
      title={t("gpuFormTitle")}
      hint={[t("hintWhere"), t("gpuFormHint1"), t("gpuFormHint2")]}
      error={error}
      submitLabel={t("addGpuBtn")}
      onSubmit={submit}
    >
      <Field id="gpuFormName" label={t("gpuFormName")} span="full">
        <input
          {...bind("name", "gpuFormName")}
          placeholder={t("gpuFormNamePlaceholder")}
          style={{ fontFamily: "var(--sans)" }}
        />
      </Field>
      <Field
        id="gpuFormArchitecture"
        label={t("gpuFormArchitecture")}
        tip="gpuFormArchitecture"
      >
        <select
          id="gpuFormArchitecture"
          value={architecture}
          onChange={(event) => setArchitecture(event.target.value)}
        >
          {ARCHITECTURES.map((name) => (
            <option key={name}>{name}</option>
          ))}
          <option value={JETSON}>{t("gpuFormJetson")}</option>
        </select>
      </Field>
      <Field id="gpuFormTflops" label={t("gpuFormTflops")} tip="gpuFormTflops">
        <NumberInput
          {...bind("tflops", "gpuFormTflops")}
          placeholder={t("gpuFormTflopsPlaceholder")}
        />
      </Field>
      <Field
        id="gpuFormDecoders"
        label={t(isJetson ? "gpuFormDecoderStreams" : "gpuFormDecoders")}
      >
        <NumberInput
          {...bind("decoders", "gpuFormDecoders")}
          placeholder={isJetson ? "22" : "2"}
        />
      </Field>
      <Field id="gpuFormMemory" label={t("gpuFormMemory")}>
        <NumberInput {...bind("memory", "gpuFormMemory")} placeholder="48" />
      </Field>
      <Field id="gpuFormTdp" label={t("gpuFormTdp")}>
        <NumberInput integer {...bind("tdp", "gpuFormTdp")} placeholder="300" />
      </Field>
      <Field id="gpuFormPrice" label={t("gpuFormPrice")}>
        <NumberInput
          integer
          {...bind("price", "gpuFormPrice")}
          placeholder={t("gpuFormPricePlaceholder")}
        />
      </Field>
      <label
        className="f full"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--fg)",
          minHeight: 32,
        }}
      >
        <input
          type="checkbox"
          id="gpuFormEnabled"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>{t("gpuFormEnabled")}</span>
      </label>
    </TemplateForm>
  );
}
