// Форма своего объекта детекции: габариты и порог, разбор и проверка — parseDetectionObject из domain.
import { useState, type ChangeEvent } from "react";
import { t } from "../../i18n/index.ts";
import { parseDetectionObject } from "../../domain/entities/detection-object.ts";
import { parseNum } from "../../domain/parse-num.ts";
import { uid } from "../../app/examples.ts";
import { addDetectionObject } from "../../app/store.ts";
import { Field } from "../components/Field.tsx";
import { NumberInput } from "../components/NumberInput.tsx";
import { toast } from "../components/Toast.tsx";
import { formErrorText, type FormErrorKeys } from "./form-errors.ts";
import { TemplateForm } from "./TemplateForm.tsx";

const OBJECT_FORM_ERRORS: FormErrorKeys = {
  name: "errorName",
  width: "errorObjectSize",
  length: "errorObjectSize",
  height: "errorObjectSize",
  requiredPx: "errorRequiredPx",
};

// поля формы; после добавления объекта очищаются
type ObjectDraft = Record<
  "name" | "width" | "length" | "height" | "requiredPx",
  string
>;
const EMPTY_DRAFT: ObjectDraft = {
  name: "",
  width: "",
  length: "",
  height: "",
  requiredPx: "",
};

export function ObjectForm() {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState("");

  const bind = (field: keyof ObjectDraft, id: string) => ({
    id,
    value: draft[field],
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      setDraft({ ...draft, [field]: event.target.value }),
  });

  const submit = () => {
    const parsed = parseDetectionObject({
      id: "o" + uid(),
      name: draft.name.trim(),
      width: parseNum(draft.width),
      length: parseNum(draft.length),
      height: parseNum(draft.height),
      requiredPx: parseNum(draft.requiredPx),
      custom: true,
    });
    if (!parsed.ok) {
      setError(
        t("cameraFormError", formErrorText(parsed.errors, OBJECT_FORM_ERRORS)),
      );
      return;
    }
    setError("");
    addDetectionObject(parsed.value);
    setDraft(EMPTY_DRAFT);
    toast(t("detectionObjectAdded", parsed.value.name ?? ""));
  };

  return (
    <TemplateForm
      id="objectForm"
      title={t("objectFormTitle")}
      hint={[t("hintWhere"), t("objectFormHint1"), t("objectFormHint2")]}
      error={error}
      submitLabel={t("addDetectionObjectBtn")}
      onSubmit={submit}
    >
      <Field id="objectFormName" label={t("typeName")} span="full">
        <input
          {...bind("name", "objectFormName")}
          placeholder={t("objectFormNamePlaceholder")}
          style={{ fontFamily: "var(--sans)" }}
        />
      </Field>
      <Field id="objectFormWidth" label={t("objectWidth")}>
        <NumberInput {...bind("width", "objectFormWidth")} />
      </Field>
      <Field id="objectFormLength" label={t("objectLength")}>
        <NumberInput {...bind("length", "objectFormLength")} />
      </Field>
      <Field id="objectFormHeight" label={t("objectHeight")}>
        <NumberInput {...bind("height", "objectFormHeight")} />
      </Field>
      <Field id="objectFormRequired" label={t("objectRequiredPx")}>
        <NumberInput {...bind("requiredPx", "objectFormRequired")} />
      </Field>
    </TemplateForm>
  );
}
