// Результат активного типа камер: вердикт, показатели объектива и кадра, плотность, схема.
import type { ReactNode } from "react";
import {
  STR,
  displayName,
  formatNumber,
  t,
  withUnit,
} from "../../../i18n/index.ts";
import {
  noteText,
  verdictHeadline,
  verdictPill,
} from "../../../i18n/domain-text.ts";
import { DEG } from "../../../domain/angles.ts";
import type { TypeResult as Result } from "../../../domain/compute-type/index.ts";
import { activeType, state } from "../../../app/store.ts";
import { useComputed } from "../../hooks/useComputed.ts";
import { cameraLabel } from "../../lib/labels.ts";
import { SideDiagram } from "./SideDiagram.tsx";

// action — кнопка под вердиктом
export function TypeResult({ action }: { action: ReactNode }) {
  const { results } = useComputed();
  const result = results[state.cameraTypes.indexOf(activeType())];
  return (
    <>
      <div className="reshead">
        <h2 id="resultTitle">
          {t("resultTitleOf", displayName(result.type) || t("untitled"))}
        </h2>
        {result.ok ? (
          <div className={"verdict " + result.status} id="verdict">
            <span className="pill">
              {verdictPill(result.verdict, result.notes)}
            </span>
            <div>
              {verdictHeadline(result.verdict)}
              {result.notes.length > 0 && (
                <ul>
                  {result.notes.map((note, i) => (
                    <li key={i}>{noteText(note)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="verdict bad" id="verdict">
            <span className="pill">{t("pillError")}</span>
            <div>{t("inputError")}</div>
          </div>
        )}
        {action}
      </div>
      <div className="resbody">
        <figure className="sidefig">
          <figcaption>
            <span className="figt">{t("sideFigure")}</span>
            <span className="figl">
              <span>
                <i className="lg-fov" aria-hidden="true"></i>
                <span>{t("legendFov")}</span>
              </span>
              <span>
                <i className="lg-ax" aria-hidden="true"></i>
                <span>{t("legendAxis")}</span>
              </span>
              <span>
                <i className="lg-zone" aria-hidden="true"></i>
                <span>{t("legendZone")}</span>
              </span>
            </span>
          </figcaption>
          {result.ok ? (
            <SideDiagram
              {...result.geometry}
              vfov={result.lens.vfov}
              placement={result.placement}
            />
          ) : (
            <svg
              id="side"
              viewBox="0 0 680 510"
              role="img"
              aria-label={t("sideAria")}
            ></svg>
          )}
        </figure>
        <div className="rcol">
          {result.ok ? (
            <Details result={result} />
          ) : (
            <>
              <div className="kpis" id="kpis"></div>
              <table id="densityTable"></table>
              <div className="facts" id="facts"></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const DORI_LEVELS = [25, 62, 125, 250];

// показатели, плотность и факты для типа без ошибок во вводе
function Details({ result }: { result: Extract<Result, { ok: true }> }) {
  const { hfov, vfov, f, rotated } = result.lens,
    { tilt, frameWidthNear, frameWidthFar } = result.geometry;
  const kpis = [
    [
      t("kpiFocal"),
      withUnit(formatNumber(f, 1), "mm"),
      t(
        result.lens.clamped
          ? "kpiFocalLimit"
          : result.lens.mode === "auto"
            ? "kpiFocalAuto"
            : "kpiFocalSet",
      ) + (rotated ? t("kpiRotated") : ""),
    ],
    [
      t(rotated ? "kpiAngleRotated" : "kpiAngle"),
      formatNumber(hfov / DEG, 0) + "° × " + formatNumber(vfov / DEG, 0) + "°",
      `DFOV ≈ ${formatNumber((2 * Math.atan(Math.hypot(Math.tan(hfov / 2), Math.tan(vfov / 2)))) / DEG, 0)}°`,
    ],
    [
      t("kpiTilt"),
      formatNumber(tilt / DEG, 0) + "°",
      t(Math.abs(tilt / DEG - 90) < 1 ? "kpiTiltDown" : "kpiTiltHorizon"),
    ],
    [
      t("kpiFrame"),
      withUnit(
        formatNumber(frameWidthNear, 1) + "–" + formatNumber(frameWidthFar, 1),
        "m",
      ),
      t("kpiFrameSubtitle"),
    ],
  ];
  const top = result.placement === "top",
    { near, far, minAcross } = result.density;
  const doriLevel = DORI_LEVELS.findLastIndex((level) => minAcross >= level);
  const shutter = result.shutterDenominator;
  return (
    <>
      <div className="kpis" id="kpis">
        {kpis.map(([label, value, extra]) => (
          <div className="kpi" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <em>{extra}</em>
          </div>
        ))}
      </div>
      <table id="densityTable">
        <tbody>
          <tr>
            <th>{t("densityHeader")}</th>
            <th>{t("across")}</th>
            <th>{t("depth")}</th>
          </tr>
          <tr>
            <td className="txt">
              {t(top ? "edgeBack" : "edgeNear")},{" "}
              {withUnit(formatNumber(near.D, 1), "m")}
            </td>
            <td>{formatNumber(near.across, 0)}</td>
            <td>{formatNumber(near.depth, 0)}</td>
          </tr>
          <tr>
            <td className="txt">
              {t(top ? "edgeForward" : "edgeFar")},{" "}
              {withUnit(formatNumber(far.D, 1), "m")}
            </td>
            <td>{formatNumber(far.across, 0)}</td>
            <td>{formatNumber(far.depth, 0)}</td>
          </tr>
        </tbody>
      </table>
      <div className="facts" id="facts">
        <span>
          DORI: <b>{doriLevel < 0 ? t("doriBelow") : STR.dori[doriLevel]}</b> (
          {withUnit(formatNumber(minAcross, 0), "pxm")})
        </span>
        <span>
          {t("exposure")}{" "}
          <b className="mono">
            {isFinite(shutter) && shutter > 0
              ? withUnit("1/" + Math.ceil(shutter), "s")
              : "—"}
          </b>
        </span>
        <span>
          {t("camera")}: <b>{cameraLabel(result)}</b>
        </span>
      </div>
    </>
  );
}
