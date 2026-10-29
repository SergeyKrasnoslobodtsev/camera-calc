// Форма нового шаблона: поля, подсказка, ошибка разбора, кнопки «добавить» и «к расчёту».
import type { FormEvent, ReactNode } from "react";
import { t } from "../../i18n/index.ts";

type TemplateFormProps = {
  id: string; // id формы; у заголовка и ошибки — id + "Title", id + "Error"
  title: string;
  hint: [title: string, first: string, second: string];
  error: string; // пустая — ошибки нет
  submitLabel: string;
  onSubmit: () => void;
  children: ReactNode;
};

export function TemplateForm({
  id,
  title,
  hint: [hintTitle, ...hintLines],
  error,
  submitLabel,
  onSubmit,
  children,
}: TemplateFormProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <section className="panel newc" aria-labelledby={id + "Title"}>
      <div className="colhead">
        <h2 id={id + "Title"}>{title}</h2>
      </div>
      <form id={id} autoComplete="off" noValidate onSubmit={submit}>
        {children}
        <div className="hint">
          <b>{hintTitle}</b>
          {hintLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
        <div className="err" id={id + "Error"} role="alert" hidden={!error}>
          {error}
        </div>
        <div
          style={{
            gridColumn: "1/-1",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button type="submit" className="primary">
            {submitLabel}
          </button>
          <a className="btn" href="#">
            {t("toCalculation")}
          </a>
        </div>
      </form>
    </section>
  );
}
