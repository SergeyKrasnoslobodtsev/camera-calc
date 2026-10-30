// Нагрузка на GPU: итог подбора, инференс по типам с раскрытием до моделей, шкалы декодера и памяти.
import { useState } from "react";
import {
  STR,
  displayName,
  formatNumber,
  t,
  withUnit,
} from "../../../i18n/index.ts";
import { bottleneckText, objectName } from "../../../i18n/domain-text.ts";
import {
  typeLoads,
  type SystemResult,
  type TypeRunLoad,
} from "../../../domain/compute-system/index.ts";
import { Meter } from "../../components/Meter.tsx";
import { useComputed } from "../../hooks/useComputed.ts";
import { modelName, percent } from "../../lib/labels.ts";

export function GpuLoad() {
  const { system } = useComputed();
  return (
    <>
      <h2 id="loadTitle">{t("loadTitle")}</h2>
      {system ? (
        <Load system={system} />
      ) : (
        <p className="note" id="loadNote">
          <span style={{ color: "var(--bad)" }}>{t("systemInputError")}</span>
        </p>
      )}
    </>
  );
}

const TYPE_COLORS = [
  "var(--c1)",
  "var(--c2)",
  "var(--c3)",
  "var(--c4)",
  "var(--c5)",
];
const OTHER_COLOR = "var(--c6)";

const runText = (run: TypeRunLoad) =>
  `${modelName(run)} · ${STR.feedsShort[run.feed.mode]} ${run.feed.inputSize}`;

type LoadRow = {
  key: string;
  name: string;
  color: string;
  share: number;
  details: { key: string; name: string; sub: string; share: number }[];
};

// пять самых нагруженных типов отдельными строками, остальные — одной строкой «Другие типы»
function loadRows(system: SystemResult): LoadRow[] {
  const loads = typeLoads(system.chosen);
  const rows: LoadRow[] = loads.slice(0, 5).map((load, i) => ({
    key: load.type.id,
    name: displayName(load.type),
    color: TYPE_COLORS[i],
    share: load.share,
    details: load.runs.map((run, runIndex) => ({
      key: String(runIndex),
      name: run.objects.map(objectName).join(", "),
      sub: `${runText(run)} · ${withUnit(formatNumber(run.load, 0), "fps")}`,
      share: run.share,
    })),
  }));
  const rest = loads.slice(5);
  if (rest.length)
    rows.push({
      key: "other",
      name: t("otherTypes", rest.length),
      color: OTHER_COLOR,
      share: rest.reduce((sum, load) => sum + load.share, 0),
      details: rest.map((load) => ({
        key: load.type.id,
        name: displayName(load.type),
        sub: load.runs.map(runText).join(", "),
        share: load.share,
      })),
    });
  return rows;
}

// подбор GPU выполнен: в параметрах системы и ценах карт нет ошибок
function Load({ system }: { system: SystemResult }) {
  const { chosen, optimum, maxLoad, liveResults } = system;
  const [openRow, setOpenRow] = useState<string | null>(null);
  const rows = loadRows(system);
  const decodeCapacity =
    (chosen.count * system.decodeUnitsTotal) / (chosen.decodeGpus || 1);
  const warning = system.noCandidates
    ? t("noCandidates")
    : !optimum && liveResults.length
      ? t("noFit")
      : "";
  const gpuNote = (STR.gpuNotes as Record<string, string>)[chosen.gpu.id];
  const note = warning ? (
    <span style={{ color: "var(--bad)" }}>{warning}</span>
  ) : liveResults.length && gpuNote ? (
    gpuNote
  ) : null;
  return (
    <>
      <div className="dsum" id="loadSummary">
        {/* карта, их число и цена — в сводке системы */}
        {liveResults.length > 0 && (
          <>
            {chosen.ok ? (
              t(chosen === optimum ? "optimum" : "manual")
            ) : (
              <span style={{ color: "var(--bad)" }}>{t("insufficient")}</span>
            )}{" "}
            · {t("headroom", percent(Math.max(0, 1 - chosen.worstLoad)))} ·{" "}
            {t("bottleneck", bottleneckText(chosen.bottleneck))}
          </>
        )}
      </div>
      {liveResults.length > 0 && (
        <Meter
          label={t("loadByTypes", percent(maxLoad))}
          load={chosen.inferenceLoad}
          limit={maxLoad}
          segments={rows.map(({ share, color }) => ({
            fraction: share,
            color,
          }))}
        />
      )}
      <ul className="legend" id="legend">
        {liveResults.length ? (
          rows.flatMap((row) => {
            const open = openRow === row.key;
            return [
              <li key={row.key}>
                <span className="sw" style={{ background: row.color }}></span>
                <button
                  type="button"
                  className="exp"
                  aria-expanded={open}
                  onClick={() => setOpenRow(open ? null : row.key)}
                >
                  <span>{row.name}</span>
                  <span aria-hidden="true">{open ? "▴" : "▾"}</span>
                </button>
                <span className="pc">{percent(row.share)}</span>
              </li>,
              ...(open ? row.details : []).map((detail) => (
                <li className="model" key={`${row.key}-${detail.key}`}>
                  <span></span>
                  <span>
                    {detail.name}
                    <span className="sub">{detail.sub}</span>
                  </span>
                  <span className="pc">{percent(detail.share)}</span>
                </li>
              )),
            ];
          })
        ) : (
          <li className="note">{t("noLoad")}</li>
        )}
      </ul>
      <div className="gauges" id="gauges">
        {liveResults.length > 0 && (
          <>
            <Meter
              label={`${t("gaugeDecoder")} · ${t(
                "gaugeDecoderSubtitle",
                formatNumber(system.decodeUnitsTotal, 1),
                formatNumber(decodeCapacity, 0),
              )}`}
              load={chosen.decodeLoad}
              limit={maxLoad}
            />
            <Meter
              label={`${t("gaugeMemory")} · ${t(
                "gaugeMemorySubtitle",
                formatNumber(chosen.memoryUseGB, 1),
                formatNumber(chosen.memoryCapGB, 0),
              )}`}
              load={chosen.memoryLoad}
            />
          </>
        )}
      </div>
      <p className="note" id="loadNote" hidden={!note}>
        {note}
      </p>
    </>
  );
}
