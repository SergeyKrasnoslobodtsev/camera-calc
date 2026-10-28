// число из значения поля: десятичная запятая допускается, не число — NaN
export const parseNum = (value: unknown) =>
  parseFloat(String(value ?? "").replace(",", "."));
