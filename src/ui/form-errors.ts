// Текст ошибки формы шаблона по ошибкам разбора из domain.
import { t, type TextKey } from "../i18n/index.ts";
import type { FieldError } from "../domain/entities/parse-result.ts";

// ключ сообщения по полю; одно сообщение может относиться к нескольким полям
export type FormErrorKeys = Record<string, TextKey>;
export const formErrorText = (
  errors: FieldError[],
  messageKeys: FormErrorKeys,
) =>
  [...new Set(errors.map((error) => t(messageKeys[error.field])))].join(", ");
