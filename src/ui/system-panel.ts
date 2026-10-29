// Панель «Система»: параметры системы, итоги по камерам и сети, подбор GPU и нагрузка на него.
import { STR, displayName, formatNumber, t, withUnit } from "../i18n/index.ts";
import { bottleneckText, objectName, portText } from "../i18n/domain-text.ts";
import type { ValidObject } from "../domain/compute-type/index.ts";
import type {
  SystemResult,
  SystemTotals,
} from "../domain/compute-system/index.ts";
import {
  allGpus,
  gpuById,
  state,
  updateSystem,
  type SystemDraft,
  type TypeOutcome,
} from "../app/store.ts";
import { byId, escapeHtml, type Field } from "./dom.ts";
import { modelName } from "./labels.ts";

// ---------- кольца
// кольцо радиуса r и толщины width из дуг segments (fraction — доля круга); mark — риска на доле круга
function ring(
  cx: number,
  cy: number,
  r: number,
  width: number,
  segments: { fraction: number; color: string }[],
  mark: number | null,
) {
  const circumference = 2 * Math.PI * r;
  let offset = 0,
    svg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${width}"/>`;
  segments.forEach((segment) => {
    const arc =
      Math.max(0, Math.min(1 - offset / circumference, segment.fraction)) *
      circumference;
    if (arc <= 0) return;
    // зазор 1 px между соседними дугами
    const dash = segments.length > 1 && arc > 2 ? arc - 1 : arc;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${segment.color}" stroke-width="${width}" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    offset += arc;
  });
  if (mark != null) {
    const angle = -Math.PI / 2 + 2 * Math.PI * mark,
      innerR = r - width / 2 - 2,
      outerR = r + width / 2 + 2;
    svg += `<line x1="${(cx + innerR * Math.cos(angle)).toFixed(2)}" y1="${(cy + innerR * Math.sin(angle)).toFixed(2)}" x2="${(cx + outerR * Math.cos(angle)).toFixed(2)}" y2="${(cy + outerR * Math.sin(angle)).toFixed(2)}" stroke="var(--fg2)" stroke-width="1.5"/>`;
  }
  return svg;
}

// ---------- система
// system — null, если в параметрах системы или в цене карты ошибка: подбор GPU не выполнен
export function renderSystem(
  results: TypeOutcome[],
  system: SystemResult | null,
  totals: SystemTotals,
) {
  const { cameraCount, totalMbps, cameraCost } = totals;
  const percent = (share: number) => formatNumber(share * 100, 0) + "%";
  const allObjects = results.flatMap((result) =>
      result.ok
        ? result.objects.filter((item): item is ValidObject => item.valid)
        : [],
    ),
    okObjects = allObjects.filter((obj) => obj.status === "ok").length;
  const worstStatus = results.some(
    (result) => !result.ok || result.status === "bad",
  )
    ? "bad"
    : results.some((result) => result.ok && result.status === "warn")
      ? "warn"
      : "ok";
  const smallest = allObjects.length
    ? allObjects.reduce((a, b) => (a.modelPx < b.modelPx ? a : b))
    : null;
  byId("systemKpis").innerHTML = [
    [
      t("systemCameras"),
      `${cameraCount}`,
      cameraCost
        ? t("systemTypes", results.length) +
          t("systemCameraCost", "$" + formatNumber(cameraCost, 0))
        : t(
            "systemTypes",
            results.length,
            results.map((result) => displayName(result.type)).join(", "),
          ),
    ],
    [
      t("systemObjects"),
      `<span class="dot ${worstStatus}" aria-hidden="true"></span>${t("systemOfTotal", okObjects, allObjects.length)}`,
      smallest
        ? t(
            "systemSmallest",
            displayName(smallest.object),
            formatNumber(
              Math.min(smallest.widthPx, smallest.heightPx) *
                smallest.feed.modelScale,
              1,
            ),
          )
        : t("systemNoObjects"),
    ],
    [
      t("systemCompute"),
      system && system.liveResults.length
        ? `${system.chosen.count} × ${escapeHtml(system.chosen.gpu.name)}`
        : "—",
      !system
        ? t("tabError")
        : system.liveResults.length
          ? `$${formatNumber(system.chosen.cost, 0)} · ${system.chosen.ok ? t(system.chosen === system.optimum ? "optimum" : "manual") + " · " + t("headroom", percent(Math.max(0, 1 - system.chosen.worstLoad))) : t("insufficient")}`
          : t("systemNoCameras"),
    ],
    [
      t("systemNetwork"),
      `${withUnit(formatNumber(totalMbps, 0), "mbps")}`,
      t("systemPort", portText(totals.port), formatNumber(totals.poeW, 0)),
    ],
  ]
    .map(
      ([label, value, extra]) =>
        `<div class="sk"><span>${label}</span><strong>${value}</strong><em>${escapeHtml(extra)}</em></div>`,
    )
    .join("");
  // сеть
  const { archiveDays, archiveTB } = totals;
  byId("networkTable").innerHTML =
    `<tr>${(["networkType", "networkCameras", "networkResolution", "networkFps", "networkPerCamera", "networkAll"] as const).map((key) => `<th>${t(key)}</th>`).join("")}</tr>` +
    results
      .map((result) =>
        !result.ok
          ? `<tr><td class="txt">${escapeHtml(displayName(result.type))}</td><td>${result.count}</td><td colspan="4" class="dim" style="text-align:left">${t("tabError")}</td></tr>`
          : `<tr><td class="txt">${escapeHtml(displayName(result.type))}</td><td>${result.count}</td><td>${result.frame.width} × ${result.frame.height}</td><td>${formatNumber(result.stream.fps, 0)}</td><td>${withUnit(formatNumber(result.stream.bitrateMbps, 1), "mbps")}</td><td>${withUnit(formatNumber(result.stream.bitrateMbps * result.count, 0), "mbps")}</td></tr>`,
      )
      .join("") +
    `<tr class="total"><td class="txt">${t("networkTotal")}</td><td>${cameraCount}</td><td></td><td></td><td></td><td>${withUnit(formatNumber(totalMbps, 0), "mbps")}</td></tr>` +
    `<tr><td class="txt dim">${t("networkArchive")}</td><td colspan="5" class="dim">${!(archiveDays >= 0) ? t("tabError") : archiveDays > 0 ? t("networkArchiveValue", formatNumber(archiveTB, 1), formatNumber(archiveDays, 0)) : t("networkArchiveOff")}</td></tr>`;
  byId("assumptionsList").innerHTML = t(
    "assumptions",
    system ? formatNumber(system.efficiency, 2) : "—",
  )
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  // дашборд
  if (!system) {
    ["loadSummary", "donut", "legend", "gauges"].forEach(
      (id) => (byId<Element>(id).innerHTML = ""),
    );
    byId("loadNote").innerHTML =
      `<span style="color:var(--bad)">${escapeHtml(t("systemInputError"))}</span>`;
    byId("loadNote").hidden = false;
    return;
  }
  const { chosen, optimum, maxLoad, liveResults } = system;
  const overloaded = chosen.inferenceLoad > maxLoad;
  byId("loadSummary").innerHTML = liveResults.length
    ? `<b>${chosen.count} × ${escapeHtml(chosen.gpu.name)}</b> · $${formatNumber(chosen.cost, 0)} · ${chosen.ok ? t(chosen === optimum ? "optimum" : "manual") : `<span style="color:var(--bad)">${t("insufficient")}</span>`}<br>${t("headroom", percent(Math.max(0, 1 - chosen.worstLoad)))} · ${t("bottleneck", bottleneckText(chosen.bottleneck))}`
    : "";
  const runs = chosen.runs
    .filter((run) => !run.unknownModel)
    .map((run) => ({ ...run, share: run.gpusNeeded / chosen.count }))
    .sort((a, b) => b.share - a.share);
  const RUN_COLORS = [
    "var(--c1)",
    "var(--c2)",
    "var(--c3)",
    "var(--c4)",
    "var(--c5)",
  ];
  const shown = runs.slice(0, 5),
    rest = runs.slice(5),
    restShare = rest.reduce((sum, run) => sum + run.share, 0);
  const segments = shown.map((run, i) => ({
    fraction: run.share,
    color: RUN_COLORS[i],
  }));
  if (restShare > 0) segments.push({ fraction: restShare, color: "var(--c6)" });
  const donut = byId<SVGSVGElement>("donut");
  donut.innerHTML = liveResults.length
    ? ring(60, 60, 48, 14, segments, maxLoad) +
      `<text x="60" y="61" text-anchor="middle" class="big" style="fill:${overloaded ? "var(--bad)" : "var(--fg)"}">${percent(chosen.inferenceLoad)}</text><text x="60" y="77" text-anchor="middle" class="cap">${t("donutCaption")}</text>`
    : "";
  donut.setAttribute(
    "aria-label",
    t("donutAriaValue", percent(chosen.inferenceLoad), percent(maxLoad)),
  );
  byId("legend").innerHTML = liveResults.length
    ? shown
        .map(
          (run, i) =>
            `<li><span class="sw" style="background:${RUN_COLORS[i]}"></span><span>${escapeHtml(modelName(run))} · ${STR.feedsShort[run.feed.mode]} ${run.feed.inputSize}<span class="sub">${escapeHtml(displayName(run.type))}: ${escapeHtml(run.objects.map(objectName).join(", "))} · ${withUnit(formatNumber(run.load, 0), "fps")}</span></span><span class="pc">${percent(run.share)}</span></li>`,
        )
        .join("") +
      (rest.length
        ? `<li><span class="sw" style="background:var(--c6)"></span><span>${t("otherRuns", rest.length)}</span><span class="pc">${percent(restShare)}</span></li>`
        : "") +
      `<li><span class="sw" style="background:var(--track)"></span><span>${t("free")}<span class="sub">${t("freeSubtitle", percent(maxLoad))}</span></span><span class="pc">${percent(Math.max(0, 1 - chosen.inferenceLoad))}</span></li>`
    : `<li class="note">${t("noLoad")}</li>`;
  const decodeCapacity =
    (chosen.count * system.decodeUnitsTotal) / (chosen.decodeGpus || 1);
  const gauge = (
    label: string,
    load: number,
    limit: number,
    center: string,
    sub: string,
  ) =>
    `<div class="gauge"><svg viewBox="0 0 84 84" role="img" aria-label="${label}: ${center}">${ring(42, 42, 32, 9, [{ fraction: load, color: load > limit ? "var(--bad)" : "var(--meter)" }], limit < 1 ? limit : null)}<text x="42" y="48" text-anchor="middle" class="mid" style="font-size:17px">${center}</text></svg><span><b>${label}</b>${sub}</span></div>`;
  byId("gauges").innerHTML = liveResults.length
    ? gauge(
        t("gaugeDecoder"),
        chosen.decodeLoad,
        maxLoad,
        percent(chosen.decodeLoad),
        t(
          "gaugeDecoderSubtitle",
          formatNumber(system.decodeUnitsTotal, 1),
          formatNumber(decodeCapacity, 0),
        ),
      ) +
      gauge(
        t("gaugeMemory"),
        chosen.memoryLoad,
        1,
        percent(chosen.memoryLoad),
        t(
          "gaugeMemorySubtitle",
          formatNumber(chosen.memoryUseGB, 1),
          formatNumber(chosen.memoryCapGB, 0),
        ),
      )
    : "";
  const warning = system.noCandidates
    ? t("noCandidates")
    : !optimum && liveResults.length
      ? t("noFit")
      : "";
  const gpuNote = (STR.gpuNotes as Record<string, string>)[chosen.gpu.id];
  const loadNote = byId("loadNote");
  loadNote.innerHTML = warning
    ? `<span style="color:var(--bad)">${escapeHtml(warning)}</span>`
    : liveResults.length && gpuNote
      ? escapeHtml(gpuNote)
      : "";
  loadNote.hidden = !loadNote.innerHTML;
}

// ---------- параметры системы
export function buildGpuSelect() {
  const select = byId<HTMLSelectElement>("gpu");
  select.innerHTML =
    `<option value="auto">${t("gpuAuto")}</option>` +
    allGpus()
      .map(
        (gpu) =>
          `<option value="${gpu.id}">${escapeHtml(gpu.name)}${gpu.custom ? t("gpuCustomMark") : ""}</option>`,
      )
      .join("");
  select.value = state.system.gpu;
  const refSelect = byId<HTMLSelectElement>("detectorFormRefGpu");
  if (refSelect) {
    const refCurrent = refSelect.value;
    refSelect.innerHTML = allGpus()
      .map(
        (gpu) => `<option value="${gpu.id}">${escapeHtml(gpu.name)}</option>`,
      )
      .join("");
    refSelect.value = gpuById(refCurrent) ? refCurrent : "5090";
  }
}
const SYSTEM_IDS: readonly (keyof SystemDraft)[] = [
  "efficiency",
  "reserve",
  "archiveDays",
  "gpu",
  "gpuCount",
];
export function writeSystemForm() {
  SYSTEM_IDS.forEach((id) => (byId<Field>(id).value = state.system[id]));
}
SYSTEM_IDS.forEach((id) => {
  const update = () => updateSystem(id, byId<Field>(id).value);
  byId(id).addEventListener("input", update);
  byId(id).addEventListener("change", update);
});
