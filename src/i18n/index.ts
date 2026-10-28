// Язык интерфейса, словарь этого языка, t() и форматирование чисел.
import { RU, type Dictionary } from "./ru.ts";
import { EN } from "./en.ts";

export type Lang = "ru" | "en";
type Key = keyof Dictionary;
// параметры текста: у функции — её аргументы, у строки — никаких
type Params<K extends Key> = Dictionary[K] extends (...args: infer P) => unknown
  ? P
  : [];
type Text<K extends Key> = Dictionary[K] extends (...args: never[]) => infer R
  ? R
  : Dictionary[K];

// язык: выбор из localStorage, иначе язык браузера
export const LANG_KEY = "camcalc-lang";
export const LANG: Lang = (() => {
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch (error) {}
  return saved === "ru" || saved === "en"
    ? saved
    : /^ru\b/i.test(navigator.language || "")
      ? "ru"
      : "en";
})();
export const STR: Dictionary = LANG === "en" ? EN : RU;

// число и единица измерения через неразрывный пробел; unit — ключ словаря STR.units
export const withUnit = (
  value: string | number,
  unit: keyof Dictionary["units"],
) => value + "\u00a0" + STR.units[unit];

// t — текст по ключу словаря; если значение — функция, вызывается с params
export function t<K extends Key>(key: K, ...params: Params<K>): Text<K> {
  const text: unknown = STR[key];
  return (typeof text === "function" ? text(...params) : text) as Text<K>;
}

// число по правилам языка, минус — типографский; не число — прочерк
export const formatNumber = (value: number, digits = 1) =>
  isFinite(value)
    ? value
        .toLocaleString(LANG === "en" ? "en-US" : "ru-RU", {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        })
        .replace("-", "−")
    : "—";
