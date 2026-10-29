// Поле формы: подпись, кнопка «?» с подсказкой и элемент ввода с id.
import type { ReactNode } from "react";
import type { TipField } from "./Popover.tsx";
import { Tip } from "./Tip.tsx";

type FieldProps = {
  id: string;
  label: ReactNode;
  tip?: TipField;
  span?: "full" | "c2"; // на всю ширину сетки формы или на две колонки
  hidden?: boolean;
  children: ReactNode;
};

export function Field({ id, label, tip, span, hidden, children }: FieldProps) {
  const caption = <label htmlFor={id}>{label}</label>;
  return (
    <div className={span ? `f ${span}` : "f"} hidden={hidden}>
      {tip ? (
        <div className="lrow">
          {caption}
          <Tip field={tip} />
        </div>
      ) : (
        caption
      )}
      {children}
    </div>
  );
}
