import { parseNum } from "../parse-num.ts";

// Результат разбора сырой записи (форма, сохранение, файл импорта) в сущность.
// code — правило, которое нарушило поле: required — нет значения нужного вида или пустая строка,
// positive — не число больше нуля, nonNegative — не число ≥ 0, oneOf — значение не из списка,
// order — нарушен порядок значений (например, фокус «от» больше фокуса «до»), integer — не целое число.
export type FieldError = {
  field: string;
  code: "required" | "positive" | "nonNegative" | "oneOf" | "order" | "integer";
};

export type ParseResult<T> =
  { ok: true; value: T } | { ok: false; errors: FieldError[] };

// Ошибки только в значениях чисел черновика: запись хранится как введена, расчёт показывает ошибку ввода.
// Остальные ошибки (нет поля, значение не из списка) значат, что запись не черновик формы.
export const onlyValueErrors = (errors: FieldError[]) =>
  errors.every((error) =>
    ["positive", "nonNegative", "integer"].includes(error.code),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

// Чтение полей записи по правилам: значение поля возвращается, нарушение копится в errors.
// value по умолчанию — поле записи; вложенное поле передаётся явно, например "decodeStreams.h265".
// prefix — путь вложенной записи в имени поля ошибки, например "inputs.".
export function readFields(raw: unknown, prefix = "") {
  const record = isRecord(raw) ? raw : {};
  const errors: FieldError[] = [];
  const check = (ok: boolean, field: string, code: FieldError["code"]) => {
    if (!ok) errors.push({ field: prefix + field, code });
  };
  // значение поля формы в черновике: строка как введена или число из шаблона
  const formValue = (field: string, value = record[field]) => {
    check(
      typeof value === "string" || Number.isFinite(value),
      field,
      "required",
    );
    return value as string | number;
  };
  // число из поля формы в черновике (parseNum); правило проверяется, только если значение нужного вида
  const draftNumber = (
    field: string,
    value: unknown,
    ok: (number: number) => boolean,
    code: FieldError["code"],
  ) => {
    const count = errors.length;
    const number = parseNum(formValue(field, value));
    if (errors.length === count) check(ok(number), field, code);
    return number;
  };
  return {
    record,
    errors,
    string(field: string, value = record[field]) {
      check(typeof value === "string", field, "required");
      return String(value ?? "");
    },
    formValue,
    // число из поля формы в черновике: пустое или не число — NaN, его отсекает расчёт, если поле нужно;
    // отрицательное — ошибка
    number(field: string, value = record[field]) {
      return draftNumber(
        field,
        value,
        (number) => !(number < 0),
        "nonNegative",
      );
    },
    // число из поля формы в черновике, которое нужно всегда: пустое, не число или отрицательное — ошибка
    requiredNumber(field: string, value = record[field]) {
      return draftNumber(field, value, (number) => number >= 0, "nonNegative");
    },
    text(field: string, value = record[field]) {
      check(
        typeof value === "string" && value.trim() !== "",
        field,
        "required",
      );
      return String(value ?? "");
    },
    positive(field: string, value = record[field]) {
      check(Number.isFinite(value) && (value as number) > 0, field, "positive");
      return value as number;
    },
    nonNegative(field: string, value = record[field]) {
      check(
        Number.isFinite(value) && (value as number) >= 0,
        field,
        "nonNegative",
      );
      return value as number;
    },
    oneOf<T>(field: string, list: readonly T[], value = record[field]) {
      check(list.includes(value as T), field, "oneOf");
      return value as T;
    },
    // целое, если это число: остальное проверяют positive и nonNegative
    integer(field: string, value: unknown) {
      check(
        !Number.isFinite(value) || Number.isInteger(value),
        field,
        "integer",
      );
    },
    order(field: string, ok: boolean) {
      check(ok, field, "order");
    },
  };
}

export const result = <T>(errors: FieldError[], value: T): ParseResult<T> =>
  errors.length ? { ok: false, errors } : { ok: true, value };
