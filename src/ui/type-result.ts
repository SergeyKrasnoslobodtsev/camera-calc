// Результат активного типа камер: вердикт, показатели объектива и кадра, плотность, схема.
import { STR, displayName, formatNumber, t, withUnit } from "../i18n/index.ts";
import { noteText, verdictHeadline, verdictPill } from "../i18n/domain-text.ts";
import { DEG } from "../domain/angles.ts";
import type { TypeOutcome } from "../app/store.ts";
import { byId, escapeHtml } from "./dom.ts";
import { cameraLabel } from "./labels.ts";
import { renderObjectResults } from "./object-cards.ts";
import { drawSide } from "./side-diagram.ts";

export function renderType(result: TypeOutcome) {
  const verdict = byId("verdict");
  byId("resultTitle").textContent = t(
    "resultTitleOf",
    displayName(result.type) || t("untitled"),
  );
  if (!result.ok) {
    verdict.className = "verdict bad";
    verdict.innerHTML = `<span class="pill">${t("pillError")}</span><div>${t("inputError")}</div>`;
    ["kpis", "densityTable", "facts", "side"].forEach(
      (id) => (byId<Element>(id).innerHTML = ""),
    );
    return;
  }
  verdict.className = "verdict " + result.status;
  verdict.innerHTML = `<span class="pill">${verdictPill(result.verdict, result.notes)}</span><div>${escapeHtml(verdictHeadline(result.verdict))}${result.notes.length ? "<ul>" + result.notes.map((note) => "<li>" + escapeHtml(noteText(note)) + "</li>").join("") + "</ul>" : ""}</div>`;
  const { hfov, vfov, f, rotated } = result.lens,
    { tilt, frameWidthNear, frameWidthFar } = result.geometry;
  byId("kpis").innerHTML = [
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
  ]
    .map(
      ([label, value, extra]) =>
        `<div class="kpi"><span>${label}</span><strong>${value}</strong><em>${extra}</em></div>`,
    )
    .join("");
  renderObjectResults(result);
  const top = result.placement === "top",
    { near, far, minAcross } = result.density;
  byId("densityTable").innerHTML =
    `<tr><th>${t("densityHeader")}</th><th>${t("across")}</th><th>${t("depth")}</th></tr>
    <tr><td class="txt">${t(top ? "edgeBack" : "edgeNear")}, ${withUnit(formatNumber(near.D, 1), "m")}</td><td>${formatNumber(near.across, 0)}</td><td>${formatNumber(near.depth, 0)}</td></tr>
    <tr><td class="txt">${t(top ? "edgeForward" : "edgeFar")}, ${withUnit(formatNumber(far.D, 1), "m")}</td><td>${formatNumber(far.across, 0)}</td><td>${formatNumber(far.depth, 0)}</td></tr>`;
  const doriLevels = [25, 62, 125, 250],
    doriNames = STR.dori;
  let doriLevel = -1;
  doriLevels.forEach((level, i) => {
    if (minAcross >= level) doriLevel = i;
  });
  const shutter = result.shutterDenominator;
  byId("facts").innerHTML =
    `<span>DORI: <b>${doriLevel < 0 ? t("doriBelow") : doriNames[doriLevel]}</b> (${withUnit(formatNumber(minAcross, 0), "pxm")})</span><span>${t("exposure")} <b class="mono">${isFinite(shutter) && shutter > 0 ? withUnit("1/" + Math.ceil(shutter), "s") : "—"}</b></span><span>${t("camera")}: <b>${escapeHtml(cameraLabel(result))}</b></span>`;
  const { H, h, Hc, x1, x2 } = result.geometry;
  drawSide({
    H,
    h,
    x1,
    x2,
    tilt,
    vfov,
    Hc,
    placement: result.placement,
    frameWidthNear,
    frameWidthFar,
  });
}
