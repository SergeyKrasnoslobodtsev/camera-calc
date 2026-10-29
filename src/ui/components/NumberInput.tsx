// Числовое поле: не меньше нуля; integer — только целые.
import type { InputHTMLAttributes } from "react";

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "min" | "step" | "inputMode"
> & { integer?: boolean };

export function NumberInput({ integer = false, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      min="0"
      step={integer ? "1" : "any"}
      inputMode={integer ? "numeric" : "decimal"}
      {...props}
    />
  );
}
