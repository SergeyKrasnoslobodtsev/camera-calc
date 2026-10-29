// Раздел со списком шаблонов: заголовок с числом шаблонов, пояснение, таблица.
import type { ReactNode } from "react";

type CatalogSectionProps = {
  titleId: string;
  title: string;
  note: string;
  children: ReactNode;
};

export function CatalogSection({
  titleId,
  title,
  note,
  children,
}: CatalogSectionProps) {
  return (
    <section className="panel cat" aria-labelledby={titleId}>
      <div
        className="colhead"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <span className="note">{note}</span>
      </div>
      {children}
    </section>
  );
}
