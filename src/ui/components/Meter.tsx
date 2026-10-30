// Шкала загрузки: подпись, значение и полоса; segments — части полосы, limit — риска порога.
import type { ReactNode } from "react";
import { percent } from "../lib/labels.ts";

type MeterProps = {
  label: ReactNode;
  load: number | null; // null — расчёта нет
  limit?: number;
  segments?: { fraction: number; color: string }[];
};

export function Meter({ label, load, limit = 1, segments }: MeterProps) {
  const hot = load !== null && load > limit;
  return (
    <div className="meter">
      <div className="mhead">
        <span>{label}</span>
        <b>{load === null ? "—" : percent(load)}</b>
      </div>
      <div className="track">
        {(segments ?? [{ fraction: load ?? 0, color: "" }]).map(
          ({ fraction, color }, i) => (
            <i
              key={i}
              className={hot ? "hot" : undefined}
              style={{
                width: `${Math.min(fraction, 1) * 100}%`,
                background: hot ? undefined : color || undefined,
              }}
            />
          ),
        )}
        {limit < 1 && (
          <span className="lim" style={{ left: `${limit * 100}%` }} />
        )}
      </div>
    </div>
  );
}
