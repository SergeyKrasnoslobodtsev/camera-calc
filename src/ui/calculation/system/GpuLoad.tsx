// Нагрузка на GPU: выбор карты и их числа, кольцо инференса по группам запусков, шкалы декодера и памяти.
import type { ReactNode } from "react";
import {
  STR,
  displayName,
  formatNumber,
  t,
  withUnit,
} from "../../../i18n/index.ts";
import { bottleneckText, objectName } from "../../../i18n/domain-text.ts";
import type { SystemResult } from "../../../domain/compute-system/index.ts";
import { allGpus, state, updateSystem } from "../../../app/store.ts";
import { Tip } from "../../components/Tip.tsx";
import { useComputed } from "../../hooks/useComputed.ts";
import { modelName } from "../../lib/labels.ts";

// кольцо радиуса r и толщины width из дуг segments (fraction — доля круга); mark — риска на доле круга
function Ring({
  cx,
  cy,
  r,
  width,
  segments,
  mark,
}: {
  cx: number;
  cy: number;
  r: number;
  width: number;
  segments: { fraction: number; color: string }[];
  mark: number | null;
}) {
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const arcs: ReactNode[] = [];
  segments.forEach((segment, i) => {
    const arc =
      Math.max(0, Math.min(1 - offset / circumference, segment.fraction)) *
      circumference;
    if (arc <= 0) return;
    // зазор 1 px между соседними дугами
    const dash = segments.length > 1 && arc > 2 ? arc - 1 : arc;
    arcs.push(
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={segment.color}
        strokeWidth={width}
        strokeDasharray={`${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}`}
        strokeDashoffset={(-offset).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />,
    );
    offset += arc;
  });
  const angle = -Math.PI / 2 + 2 * Math.PI * (mark ?? 0),
    innerR = r - width / 2 - 2,
    outerR = r + width / 2 + 2;
  return (
    <>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--track)"
        strokeWidth={width}
      />
      {arcs}
      {mark != null && (
        <line
          x1={(cx + innerR * Math.cos(angle)).toFixed(2)}
          y1={(cy + innerR * Math.sin(angle)).toFixed(2)}
          x2={(cx + outerR * Math.cos(angle)).toFixed(2)}
          y2={(cy + outerR * Math.sin(angle)).toFixed(2)}
          stroke="var(--fg2)"
          strokeWidth="1.5"
        />
      )}
    </>
  );
}

function Gauge({
  label,
  load,
  limit,
  center,
  sub,
}: {
  label: string;
  load: number;
  limit: number;
  center: string;
  sub: string;
}) {
  return (
    <div className="gauge">
      <svg viewBox="0 0 84 84" role="img" aria-label={`${label}: ${center}`}>
        <Ring
          cx={42}
          cy={42}
          r={32}
          width={9}
          segments={[
            {
              fraction: load,
              color: load > limit ? "var(--bad)" : "var(--meter)",
            },
          ]}
          mark={limit < 1 ? limit : null}
        />
        <text
          x="42"
          y="48"
          textAnchor="middle"
          className="mid"
          style={{ fontSize: "17px" }}
        >
          {center}
        </text>
      </svg>
      <span>
        <b>{label}</b>
        {sub}
      </span>
    </div>
  );
}

const RUN_COLORS = [
  "var(--c1)",
  "var(--c2)",
  "var(--c3)",
  "var(--c4)",
  "var(--c5)",
];

export function GpuLoad() {
  const { system } = useComputed();
  return (
    <>
      <div className="dhead">
        <h2 id="loadTitle">{t("loadTitle")}</h2>
        <a className="inlink" href="#tpl-gpus">
          {t("addGpuLink")}
        </a>
      </div>
      <div className="dsel">
        <div className="f">
          <div className="lrow">
            <label htmlFor="gpu">{t("gpu")}</label>
            <Tip field="gpu" />
          </div>
          <select
            id="gpu"
            value={state.system.gpu}
            onChange={(event) => updateSystem("gpu", event.target.value)}
          >
            <option value="auto">{t("gpuAuto")}</option>
            {allGpus().map((gpu) => (
              <option key={gpu.id} value={gpu.id}>
                {gpu.name}
                {gpu.custom ? t("gpuCustomMark") : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <div className="lrow">
            <label htmlFor="gpuCount">{t("gpuCount")}</label>
            <Tip field="gpuCount" />
          </div>
          <select
            id="gpuCount"
            value={state.system.gpuCount}
            onChange={(event) => updateSystem("gpuCount", event.target.value)}
          >
            <option value="auto">{t("auto")}</option>
            <option>1</option>
            <option>2</option>
            <option>3</option>
            <option>4</option>
          </select>
        </div>
      </div>
      {system ? (
        <Load system={system} />
      ) : (
        <>
          <div className="dsum" id="loadSummary"></div>
          <div className="donutbox">
            <svg
              id="donut"
              viewBox="0 0 120 120"
              role="img"
              aria-label={t("donutAria")}
            ></svg>
            <ul className="legend" id="legend"></ul>
          </div>
          <div className="gauges" id="gauges"></div>
          <p className="note" id="loadNote">
            <span style={{ color: "var(--bad)" }}>{t("systemInputError")}</span>
          </p>
        </>
      )}
    </>
  );
}

// подбор GPU выполнен: в параметрах системы и ценах карт нет ошибок
function Load({ system }: { system: SystemResult }) {
  const { chosen, optimum, maxLoad, liveResults } = system;
  const percent = (share: number) => formatNumber(share * 100, 0) + "%";
  const overloaded = chosen.inferenceLoad > maxLoad;
  const runs = chosen.runs
    .filter((run) => !run.unknownModel)
    .map((run) => ({ ...run, share: run.gpusNeeded / chosen.count }))
    .sort((a, b) => b.share - a.share);
  const shown = runs.slice(0, 5),
    rest = runs.slice(5),
    restShare = rest.reduce((sum, run) => sum + run.share, 0);
  const segments = shown.map((run, i) => ({
    fraction: run.share,
    color: RUN_COLORS[i],
  }));
  if (restShare > 0) segments.push({ fraction: restShare, color: "var(--c6)" });
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
        {liveResults.length > 0 && (
          <>
            <b>
              {chosen.count} × {chosen.gpu.name}
            </b>{" "}
            · ${formatNumber(chosen.cost, 0)} ·{" "}
            {chosen.ok ? (
              t(chosen === optimum ? "optimum" : "manual")
            ) : (
              <span style={{ color: "var(--bad)" }}>{t("insufficient")}</span>
            )}
            <br />
            {t("headroom", percent(Math.max(0, 1 - chosen.worstLoad)))} ·{" "}
            {t("bottleneck", bottleneckText(chosen.bottleneck))}
          </>
        )}
      </div>
      <div className="donutbox">
        <svg
          id="donut"
          viewBox="0 0 120 120"
          role="img"
          aria-label={t(
            "donutAriaValue",
            percent(chosen.inferenceLoad),
            percent(maxLoad),
          )}
        >
          {liveResults.length > 0 && (
            <>
              <Ring
                cx={60}
                cy={60}
                r={48}
                width={14}
                segments={segments}
                mark={maxLoad}
              />
              <text
                x="60"
                y="61"
                textAnchor="middle"
                className="big"
                style={{ fill: overloaded ? "var(--bad)" : "var(--fg)" }}
              >
                {percent(chosen.inferenceLoad)}
              </text>
              <text x="60" y="77" textAnchor="middle" className="cap">
                {t("donutCaption")}
              </text>
            </>
          )}
        </svg>
        <ul className="legend" id="legend">
          {liveResults.length ? (
            <>
              {shown.map((run, i) => (
                <li key={i}>
                  <span
                    className="sw"
                    style={{ background: RUN_COLORS[i] }}
                  ></span>
                  <span>
                    {modelName(run)} · {STR.feedsShort[run.feed.mode]}{" "}
                    {run.feed.inputSize}
                    <span className="sub">
                      {displayName(run.type)}:{" "}
                      {run.objects.map(objectName).join(", ")} ·{" "}
                      {withUnit(formatNumber(run.load, 0), "fps")}
                    </span>
                  </span>
                  <span className="pc">{percent(run.share)}</span>
                </li>
              ))}
              {rest.length > 0 && (
                <li>
                  <span
                    className="sw"
                    style={{ background: "var(--c6)" }}
                  ></span>
                  <span>{t("otherRuns", rest.length)}</span>
                  <span className="pc">{percent(restShare)}</span>
                </li>
              )}
              <li>
                <span
                  className="sw"
                  style={{ background: "var(--track)" }}
                ></span>
                <span>
                  {t("free")}
                  <span className="sub">
                    {t("freeSubtitle", percent(maxLoad))}
                  </span>
                </span>
                <span className="pc">
                  {percent(Math.max(0, 1 - chosen.inferenceLoad))}
                </span>
              </li>
            </>
          ) : (
            <li className="note">{t("noLoad")}</li>
          )}
        </ul>
      </div>
      <div className="gauges" id="gauges">
        {liveResults.length > 0 && (
          <>
            <Gauge
              label={t("gaugeDecoder")}
              load={chosen.decodeLoad}
              limit={maxLoad}
              center={percent(chosen.decodeLoad)}
              sub={t(
                "gaugeDecoderSubtitle",
                formatNumber(system.decodeUnitsTotal, 1),
                formatNumber(decodeCapacity, 0),
              )}
            />
            <Gauge
              label={t("gaugeMemory")}
              load={chosen.memoryLoad}
              limit={1}
              center={percent(chosen.memoryLoad)}
              sub={t(
                "gaugeMemorySubtitle",
                formatNumber(chosen.memoryUseGB, 1),
                formatNumber(chosen.memoryCapGB, 0),
              )}
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
