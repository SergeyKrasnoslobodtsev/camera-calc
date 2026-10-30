// Параметры системы: GPU, их количество и глубина архива.
import { t } from "../../../i18n/index.ts";
import { allGpus, state, updateSystem } from "../../../app/store.ts";
import { Field } from "../../components/Field.tsx";
import { NumberInput } from "../../components/NumberInput.tsx";

export function SystemForm() {
  return (
    <form
      className="panel col"
      id="systemForm"
      autoComplete="off"
      aria-labelledby="systemFormTitle"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="colhead">
        <h2 id="systemFormTitle">{t("systemFormTitle")}</h2>
      </div>
      <div className="fs" style={{ paddingTop: 12 }}>
        <Field id="gpu" label={t("gpu")} tip="gpu" span="full">
          <select
            id="gpu"
            value={state.system.gpu}
            onChange={(event) => updateSystem("gpu", event.target.value)}
          >
            <option value="auto">{t("gpuAuto")}</option>
            {allGpus().map((gpu) => (
              <option key={gpu.id} value={gpu.id}>
                {gpu.name}
                {gpu.custom ? t("gpuCustomMark") : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field id="gpuCount" label={t("gpuCount")} tip="gpuCount">
          <select
            id="gpuCount"
            value={state.system.gpuCount}
            onChange={(event) => updateSystem("gpuCount", event.target.value)}
          >
            <option value="auto">{t("auto")}</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
          </select>
        </Field>
        <Field id="archiveDays" label={t("archiveDays")} tip="archiveDays">
          <NumberInput
            integer
            id="archiveDays"
            value={state.system.archiveDays}
            onChange={(event) =>
              updateSystem("archiveDays", event.target.value)
            }
          />
        </Field>
        <a className="inlink" href="#tpl-gpus">
          {t("addGpuLink")}
        </a>
      </div>
    </form>
  );
}
