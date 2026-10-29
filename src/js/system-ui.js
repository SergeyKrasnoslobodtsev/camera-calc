import {
  LANG,
  LANG_KEY,
  STR,
  displayName,
  formatNumber,
  t,
  withUnit,
} from "../i18n/index.ts";
import {
  bottleneckText,
  feedText,
  modelPxText,
  noteText,
  objectName,
  portText,
  resolutionLabel,
  sensorPxText,
  verdictHeadline,
  verdictPill,
} from "../i18n/domain-text.ts";
import { DEG } from "../domain/angles.ts";
import { parseCamera } from "../domain/entities/camera.ts";
import { parseDetector } from "../domain/entities/detector.ts";
import { parseGpu } from "../domain/entities/gpu.ts";
import { parseNum } from "../domain/parse-num.ts";
import { GPU_CATALOG } from "../domain/references/gpu-catalog.ts";
import { MODELS } from "../domain/references/models.ts";
import {
  DEFAULT_RESOLUTION,
  RESOLUTIONS,
} from "../domain/references/resolutions.ts";
import { NEW_OBJECT, OBJECT_PRESETS, uid } from "../app/examples.ts";
import { exportText, importText } from "../app/persistence.ts";
import {
  activeType,
  addCamera,
  addDetector,
  addGpu,
  addObject,
  addType,
  allCameras,
  allGpus,
  cameraById,
  computed,
  deleteActiveType,
  deleteCamera,
  deleteDetector,
  deleteGpu,
  duplicateActiveType,
  gpuById,
  isOn,
  modelById,
  resetToExample,
  selectType,
  setGpuEnabled,
  setGpuPrice,
  state,
  toggleTheme,
  updateSystem,
} from "../app/store.ts";
import { FEED_SHORT, INPUTS, byId, decText, escapeHtml } from "./data.js";
import { readForm, writeForm } from "./state.js";
import {
  buildCameraSelect,
  renderObjectResults,
  renderObjects,
  syncFormUI,
} from "./objects.js";
import { drawSide } from "./draw-side.js";
// ---------- расчёт системы
const modelName = (obj) => (modelById(obj.model) || { name: "?" }).name;
// камера типа: из шаблона или разрешение, заданное вручную
const cameraLabel = ({ type }) => {
  const camera = cameraById(type.inputs.camera);
  return camera
    ? displayName(camera)
    : resolutionLabel(
        RESOLUTIONS[+type.inputs.resolution] ?? DEFAULT_RESOLUTION,
      );
};
// ---------- отрисовка типа
const STATUS_TEXT = STR.status;
function renderType(result) {
  const verdict = byId("verdict");
  byId("resultTitle").textContent = t(
    "resultTitleOf",
    displayName(result.type) || t("untitled"),
  );
  if (!result.ok) {
    verdict.className = "verdict bad";
    verdict.innerHTML = `<span class="pill">${t("pillError")}</span><div>${t("inputError")}</div>`;
    ["kpis", "densityTable", "facts", "side"].forEach(
      (id) => (byId(id).innerHTML = ""),
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

// ---------- вкладки
function renderTabs(results) {
  const nav = byId("tabs");
  nav.innerHTML = "";
  results.forEach((result) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "tab";
    tab.setAttribute("role", "tab");
    tab.setAttribute(
      "aria-selected",
      String(result.type.id === state.activeTypeId),
    );
    tab.setAttribute("aria-controls", "typeResult");
    tab.innerHTML = `<span class="dot ${result.ok ? result.status : "bad"}" aria-hidden="true"></span><b>${escapeHtml(displayName(result.type) || t("untitled"))}</b><small>× ${result.count}</small>`;
    tab.title = result.ok
      ? t("tabObjects", STATUS_TEXT[result.status])
      : t("tabError");
    tab.addEventListener("click", () => {
      if (state.activeTypeId === result.type.id) return;
      selectType(result.type.id);
      writeForm(activeType());
    });
    nav.append(tab);
  });
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "tab ghost";
  addButton.textContent = t("addType");
  addButton.addEventListener("click", () => {
    addType(t("newType", state.cameraTypes.length + 1), [OBJECT_PRESETS[0]]);
    writeForm(activeType());
  });
  nav.append(addButton);
}

// ---------- кольца
// кольцо радиуса r и толщины width из дуг segments (fraction — доля круга); mark — риска на доле круга
function ring(cx, cy, r, width, segments, mark) {
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
function renderSystem(results, system, totals) {
  const { chosen, optimum, efficiency, maxLoad, liveResults } = system ?? {};
  const { cameraCount, totalMbps, cameraCost } = totals;
  const percent = (share) => formatNumber(share * 100, 0) + "%";
  const allObjects = results.flatMap((result) =>
      result.ok ? result.objects.filter((item) => item.valid) : [],
    ),
    okObjects = allObjects.filter((obj) => obj.status === "ok").length;
  const worstStatus = results.some(
    (result) => !result.ok || result.status === "bad",
  )
    ? "bad"
    : results.some((result) => result.status === "warn")
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
      system && liveResults.length
        ? `${chosen.count} × ${escapeHtml(chosen.gpu.name)}`
        : "—",
      !system
        ? t("tabError")
        : liveResults.length
          ? `$${formatNumber(chosen.cost, 0)} · ${chosen.ok ? t(chosen === optimum ? "optimum" : "manual") + " · " + t("headroom", percent(Math.max(0, 1 - chosen.worstLoad))) : t("insufficient")}`
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
    `<tr>${["networkType", "networkCameras", "networkResolution", "networkFps", "networkPerCamera", "networkAll"].map((key) => `<th>${t(key)}</th>`).join("")}</tr>` +
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
    system ? formatNumber(efficiency, 2) : "—",
  )
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  // дашборд
  if (!system) {
    ["loadSummary", "donut", "legend", "gauges"].forEach(
      (id) => (byId(id).innerHTML = ""),
    );
    byId("loadNote").innerHTML =
      `<span style="color:var(--bad)">${escapeHtml(t("systemInputError"))}</span>`;
    byId("loadNote").hidden = false;
    return;
  }
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
  byId("donut").innerHTML = liveResults.length
    ? ring(60, 60, 48, 14, segments, maxLoad) +
      `<text x="60" y="61" text-anchor="middle" class="big" style="fill:${overloaded ? "var(--bad)" : "var(--fg)"}">${percent(chosen.inferenceLoad)}</text><text x="60" y="77" text-anchor="middle" class="cap">${t("donutCaption")}</text>`
    : "";
  byId("donut").setAttribute(
    "aria-label",
    t("donutAriaValue", percent(chosen.inferenceLoad), percent(maxLoad)),
  );
  byId("legend").innerHTML = liveResults.length
    ? shown
        .map(
          (run, i) =>
            `<li><span class="sw" style="background:${RUN_COLORS[i]}"></span><span>${escapeHtml(modelName(run))} · ${FEED_SHORT[run.feed.mode]} ${run.feed.inputSize}<span class="sub">${escapeHtml(displayName(run.type))}: ${escapeHtml(run.objects.map(objectName).join(", "))} · ${withUnit(formatNumber(run.load, 0), "fps")}</span></span><span class="pc">${percent(run.share)}</span></li>`,
        )
        .join("") +
      (rest.length
        ? `<li><span class="sw" style="background:var(--c6)"></span><span>${t("otherRuns", rest.length)}</span><span class="pc">${percent(restShare)}</span></li>`
        : "") +
      `<li><span class="sw" style="background:var(--track)"></span><span>${t("free")}<span class="sub">${t("freeSubtitle", percent(maxLoad))}</span></span><span class="pc">${percent(Math.max(0, 1 - chosen.inferenceLoad))}</span></li>`
    : `<li class="note">${t("noLoad")}</li>`;
  const decodeCapacity =
    (chosen.count * system.decodeUnitsTotal) / (chosen.decodeGpus || 1);
  const gauge = (label, load, limit, center, sub) =>
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
  byId("loadNote").innerHTML = warning
    ? `<span style="color:var(--bad)">${escapeHtml(warning)}</span>`
    : liveResults.length && STR.gpuNotes[chosen.gpu.id]
      ? escapeHtml(STR.gpuNotes[chosen.gpu.id])
      : "";
  byId("loadNote").hidden = !byId("loadNote").innerHTML;
}

// ---------- шаблоны: видеокарты
export function buildGpuSelect() {
  const select = byId("gpu");
  select.innerHTML =
    `<option value="auto">${t("gpuAuto")}</option>` +
    allGpus()
      .map(
        (gpu) =>
          `<option value="${gpu.id}">${escapeHtml(gpu.name)}${gpu.custom ? t("gpuCustomMark") : ""}</option>`,
      )
      .join("");
  select.value = state.system.gpu;
  const refSelect = byId("detectorFormRefGpu");
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
function renderGpuView() {
  const row = (
    gpu,
  ) => `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(gpu.name)}</b><span class="sub">${gpu.jetson ? t("gpuJetson") : escapeHtml(gpu.arch)}${gpu.custom ? " · " + t("gpuCustom") : ""}</span></td><td>${formatNumber(gpu.tflops, 1)}</td><td>${decText(gpu)}</td><td>${withUnit(formatNumber(gpu.memoryGB, 0), "gb")}</td><td>${gpu.tdpW ? withUnit(formatNumber(gpu.tdpW, 0), "w") : "—"}</td>
    <td><input id="gpuPrice-${gpu.id}" value="${escapeHtml(state.gpuPrices[gpu.id] ?? gpu.price)}" type="number" min="0" step="1" inputmode="numeric" aria-label="${escapeHtml(t("gpuPriceAria", gpu.name))}"></td>
    <td style="text-align:center"><input type="checkbox" id="gpuEnabled-${gpu.id}" ${isOn(gpu) ? "checked" : ""} aria-label="${escapeHtml(t("gpuEnabledAria", gpu.name))}"></td>
    ${gpu.custom ? `<td><button type="button" class="sm" data-delg="${gpu.id}" aria-label="${escapeHtml(t("deleteAria", gpu.name))}">${t("deleteBtn")}</button></td>` : "<td></td>"}</tr>`;
  const headers = STR.gpuTableHeader,
    head = `<tr>${headers
      .slice(0, 6)
      .map((header) => `<th>${header}</th>`)
      .join("")}<th style="text-align:center">${headers[6]}</th><th></th></tr>`;
  byId("catalogTitle").textContent = t("catalogTitle", GPU_CATALOG.length);
  byId("catalogTable").innerHTML = head + GPU_CATALOG.map(row).join("");
  byId("customGpus").innerHTML = state.customGpus.length
    ? `<strong style="font-weight:600">${t("customGpusTitle", state.customGpus.length)}</strong><div class="tbl"><table>${head}${state.customGpus.map(row).join("")}</table></div>`
    : `<strong style="font-weight:600">${t("customGpusTitleNoCount")}</strong><span class="note" style="font-size:13px">${t("customGpusEmpty")}</span>`;
  allGpus().forEach((gpu) => {
    byId(`gpuPrice-${gpu.id}`).addEventListener("input", (event) =>
      setGpuPrice(gpu.id, event.target.value),
    );
    byId(`gpuEnabled-${gpu.id}`).addEventListener("change", (event) =>
      setGpuEnabled(gpu.id, event.target.checked),
    );
  });
  document.querySelectorAll("[data-delg]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteGpu(button.dataset.delg);
      buildGpuSelect();
      renderGpuView();
      toast(t("gpuDeleted"));
    }),
  );
}
byId("gpuFormArchitecture").addEventListener("change", () => {
  const isJetson = byId("gpuFormArchitecture").value === "jet";
  byId("gpuFormDecodersLabel").textContent = t(
    isJetson ? "gpuFormDecoderStreams" : "gpuFormDecoders",
  );
  byId("gpuFormDecoders").placeholder = isJetson ? "22" : "2";
});
// текст ошибки формы шаблона: messageKeys — ключ сообщения по полю, одно сообщение на несколько полей
const formErrorText = (errors, messageKeys) =>
  [...new Set(errors.map((error) => t(messageKeys[error.field])))].join(", ");
const GPU_FORM_ERRORS = {
  name: "errorName",
  tflops: "errorTflops",
  nvdec: "errorDecoders",
  "decodeStreams.h264": "errorDecoderStreams",
  "decodeStreams.h265": "errorDecoderStreams",
  memoryGB: "errorMemory",
  tdpW: "errorTdp",
  price: "errorPrice",
};
byId("gpuForm").addEventListener("submit", (event) => {
  event.preventDefault();
  // decode — число NVDEC, у Jetson — потоков 1080p30 H.265
  const name = byId("gpuFormName").value.trim(),
    arch = byId("gpuFormArchitecture").value,
    decode = parseNum(byId("gpuFormDecoders").value),
    tdpW = parseNum(byId("gpuFormTdp").value);
  const parsed = parseGpu({
    id: "c" + uid(),
    name,
    arch: arch === "jet" ? "Ampere" : arch,
    tflops: parseNum(byId("gpuFormTflops").value),
    ...(arch === "jet"
      ? {
          jetson: true,
          decodeStreams: {
            h264: +((decode * 748) / 1415).toFixed(1),
            h265: decode,
          },
        }
      : { nvdec: decode }),
    memoryGB: parseNum(byId("gpuFormMemory").value),
    tdpW: isNaN(tdpW) ? 0 : tdpW,
    price: parseNum(byId("gpuFormPrice").value),
    custom: true,
  });
  const errorEl = byId("gpuFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "gpuFormError",
      formErrorText(parsed.errors, GPU_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addGpu(parsed.value, byId("gpuFormEnabled").checked);
  [
    "gpuFormName",
    "gpuFormTflops",
    "gpuFormDecoders",
    "gpuFormMemory",
    "gpuFormTdp",
    "gpuFormPrice",
  ].forEach((id) => (byId(id).value = ""));
  buildGpuSelect();
  renderGpuView();
  toast(t("gpuAdded", name));
});

// ---------- шаблоны: камеры
function renderCamView() {
  const used = (id) =>
    state.cameraTypes
      .filter((type) => type.inputs.camera === id)
      .reduce((sum, type) => sum + (Math.round(parseNum(type.count)) || 0), 0);
  byId("camerasTitle").textContent = t("camerasTitle", allCameras().length);
  byId("cameraTable").innerHTML =
    `<tr>${STR.cameraTableHeader.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    allCameras()
      .map(
        (camera) =>
          `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(displayName(camera))}</b><span class="sub">${t(camera.custom ? "cameraCustom" : "cameraBuiltin")}</span></td><td>${camera.Nw} × ${camera.Nh}</td><td>${withUnit(formatNumber(camera.sensorWidth, 2), "mm")}</td><td>${camera.focalMin > 0 ? (camera.focalMin === camera.focalMax ? withUnit(formatNumber(camera.focalMin, 1), "mm") : withUnit(formatNumber(camera.focalMin, 1) + "–" + formatNumber(camera.focalMax, 1), "mm")) : t("cameraAnyLens")}</td><td>${camera.price > 0 ? "$" + formatNumber(camera.price, 0) : "—"}</td><td>${used(camera.id)}</td><td>${camera.custom ? `<button type="button" class="sm" data-delc="${camera.id}" aria-label="${escapeHtml(t("deleteAria", displayName(camera)))}">${t("deleteBtn")}</button>` : ""}</td></tr>`,
      )
      .join("");
  document.querySelectorAll("[data-delc]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteCamera(button.dataset.delc);
      buildCameraSelect();
      writeForm(activeType());
      renderCamView();
      toast(t("cameraDeleted"));
    }),
  );
}
const CAMERA_FORM_ERRORS = {
  name: "errorName",
  Nw: "errorFrame",
  Nh: "errorFrame",
  sensorWidth: "errorSensorWidth",
  focalMin: "errorFocal",
  focalMax: "errorFocalRange",
  price: "errorCameraPrice",
};
byId("cameraForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId("cameraFormName").value.trim(),
    Nw = parseNum(byId("cameraFormWidth").value),
    Nh = parseNum(byId("cameraFormHeight").value),
    pixelPitchUm = parseNum(byId("cameraFormPixelPitch").value);
  let sensorWidth = parseNum(byId("cameraFormSensorWidth").value);
  let focalMin = parseNum(byId("cameraFormFocalMin").value),
    focalMax = parseNum(byId("cameraFormFocalMax").value);
  const price = parseNum(byId("cameraFormPrice").value);
  if (isNaN(sensorWidth) && pixelPitchUm > 0 && Nw > 0)
    sensorWidth = +((pixelPitchUm * Nw) / 1000).toFixed(3);
  if (focalMin > 0 && isNaN(focalMax)) focalMax = focalMin;
  if (focalMax > 0 && isNaN(focalMin)) focalMin = focalMax;
  const parsed = parseCamera({
    id: "m" + uid(),
    name,
    Nw,
    Nh,
    sensorWidth,
    focalMin: isNaN(focalMin) ? 0 : focalMin,
    focalMax: isNaN(focalMax) ? 0 : focalMax,
    price: isNaN(price) ? 0 : price,
    custom: true,
  });
  const errorEl = byId("cameraFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "cameraFormError",
      formErrorText(parsed.errors, CAMERA_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addCamera(parsed.value);
  [
    "cameraFormName",
    "cameraFormWidth",
    "cameraFormHeight",
    "cameraFormSensorWidth",
    "cameraFormPixelPitch",
    "cameraFormFocalMin",
    "cameraFormFocalMax",
    "cameraFormPrice",
  ].forEach((id) => (byId(id).value = ""));
  buildCameraSelect();
  renderCamView();
  toast(t("cameraAdded", name));
});

// ---------- шаблоны: детекторы
function renderDetView() {
  byId("detectorsTitle").textContent = t(
    "detectorsTitle",
    MODELS.length + state.customDetectors.length,
  );
  const used = (id) =>
    state.cameraTypes.reduce(
      (sum, type) =>
        sum + type.objects.filter((obj) => obj.model === id).length,
      0,
    );
  byId("detectorTable").innerHTML =
    `<tr>${STR.detectorTableHeader.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    (state.customDetectors.length
      ? state.customDetectors
          .map((detector) => {
            const refGpu = gpuById(detector.refGpu);
            return `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(detector.name)}</b><span class="sub">${t("detectorCustom")}</span></td><td>${detector.inputSize}</td><td>${detector.gflops > 0 ? formatNumber(detector.gflops, 1) : "—"}</td><td>${t("detectorSpeed", formatNumber(detector.fps, 0), escapeHtml(refGpu ? refGpu.name : "?"))}</td><td>${used(detector.id)}</td><td><button type="button" class="sm" data-deld="${detector.id}" aria-label="${escapeHtml(t("deleteAria", detector.name))}">${t("deleteBtn")}</button></td></tr>`;
          })
          .join("")
      : `<tr><td class="txt dim" colspan="6">${t("detectorsEmpty")}</td></tr>`) +
    MODELS.map(
      (model) =>
        `<tr><td class="txt">${model.name}<span class="sub">${t("detectorCatalog")}</span></td><td>640</td><td>${formatNumber(model.gflops, 1)}</td><td>${t("detectorSpeed", formatNumber(1000 / model.latencyMs, 0), "T4")}</td><td>${used(model.id)}</td><td></td></tr>`,
    ).join("");
  document.querySelectorAll("[data-deld]").forEach((button) =>
    button.addEventListener("click", () => {
      deleteDetector(button.dataset.deld);
      renderObjects();
      renderDetView();
      toast(t("detectorDeleted"));
    }),
  );
}
byId("detectorFormInput").innerHTML = INPUTS.map(
  (size) => `<option${size === 640 ? " selected" : ""}>${size}</option>`,
).join("");
const DETECTOR_FORM_ERRORS = {
  name: "errorName",
  fps: "errorFps",
  gflops: "errorGflops",
};
byId("detectorForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId("detectorFormName").value.trim(),
    gflops = parseNum(byId("detectorFormGflops").value);
  const parsed = parseDetector({
    id: "d" + uid(),
    name,
    fps: parseNum(byId("detectorFormFps").value),
    inputSize: +byId("detectorFormInput").value,
    refGpu: byId("detectorFormRefGpu").value,
    gflops: isNaN(gflops) ? 0 : gflops,
    custom: true,
  });
  const errorEl = byId("detectorFormError");
  if (!parsed.ok) {
    errorEl.hidden = false;
    errorEl.textContent = t(
      "cameraFormError",
      formErrorText(parsed.errors, DETECTOR_FORM_ERRORS),
    );
    return;
  }
  errorEl.hidden = true;
  addDetector(parsed.value);
  ["detectorFormName", "detectorFormFps", "detectorFormGflops"].forEach(
    (id) => (byId(id).value = ""),
  );
  renderObjects();
  renderDetView();
  toast(t("detectorAdded", name));
});

// ---------- отрисовка результатов: подписчик store
export function renderResults() {
  const { results, system, totals } = computed;
  const activeIndex = state.cameraTypes.indexOf(activeType());
  syncFormUI(activeType(), results[activeIndex]);
  renderType(results[activeIndex]);
  renderTabs(results);
  renderSystem(results, system, totals);
  applyTheme();
}
// текст отчёта для кнопки «Копировать отчёт»
function reportText() {
  const { results, system, totals } = computed;
  const chosen = system?.chosen;
  return [
    t("appTitle"),
    ...results.flatMap((result) =>
      !result.ok
        ? ["\n" + t("reportError", displayName(result.type), result.count)]
        : [
            `\n${displayName(result.type)} × ${result.count}`,
            t("reportCamera", {
              cameraLabel: cameraLabel(result),
              rotated: result.lens.rotated,
              sensorWidth: formatNumber(result.frame.sensorWidth, 2),
              focal: formatNumber(result.lens.f, 1),
              hfov: formatNumber(result.lens.hfov / DEG, 0),
              tilt: formatNumber(result.geometry.tilt / DEG, 0),
              overCenter: result.placement === "top",
              zoneStart: formatNumber(result.geometry.zoneStart, 2),
              cameraHeight: formatNumber(result.geometry.H, 2),
              zoneWidth: formatNumber(result.geometry.zoneWidth, 2),
              zoneDepth: formatNumber(result.geometry.zoneDepth, 2),
            }),
            ...result.objects
              .filter((item) => item.valid)
              .map((item) =>
                t("reportObject", {
                  name: displayName(item.object),
                  model: modelName(item.object),
                  feed: feedText(item.feed),
                  sensorPx: sensorPxText(item),
                  modelPx: modelPxText(item),
                  requiredPx: formatNumber(item.requiredPx, 0),
                  status: STATUS_TEXT[item.status],
                }),
              ),
            t(
              "reportStream",
              formatNumber(result.stream.bitrateMbps, 1),
              Math.ceil(result.shutterDenominator),
            ),
          ],
    ),
    "\n" +
      t(
        "reportSystem",
        totals.cameraCount,
        formatNumber(totals.totalMbps, 0),
        totals.cameraCost ? "$" + formatNumber(totals.cameraCost, 0) : "",
      ),
    !system
      ? t("reportComputeError")
      : system.liveResults.length
        ? t("reportCompute", {
            gpuCount: chosen.count,
            gpuName: chosen.gpu.name,
            cost: "$" + formatNumber(chosen.cost, 0),
            inferenceLoad: formatNumber(chosen.inferenceLoad * 100, 0),
            decodeLoad: formatNumber(chosen.decodeLoad * 100, 0),
            memoryUsed: formatNumber(chosen.memoryUseGB, 1),
            memoryCap: formatNumber(chosen.memoryCapGB, 0),
            optimum:
              system.optimum && system.optimum !== chosen
                ? `${system.optimum.count} × ${system.optimum.gpu.name}, $${formatNumber(system.optimum.cost, 0)}`
                : "",
          })
        : t("reportNoCompute"),
  ].join("\n");
}
const SYSTEM_IDS = ["efficiency", "reserve", "archiveDays", "gpu", "gpuCount"];
export function writeSystemForm() {
  SYSTEM_IDS.forEach((id) => (byId(id).value = state.system[id]));
}

// ---------- события
function applyTheme() {
  document.documentElement.classList.toggle("light", state.light);
  byId("themeBtn").textContent = t(state.light ? "themeDark" : "themeLight");
  byId("themeBtn").setAttribute("aria-pressed", String(state.light));
}
byId("themeBtn").addEventListener("click", toggleTheme);
byId("langBtn").lang = LANG === "en" ? "ru" : "en";
byId("langBtn").addEventListener("click", () => {
  try {
    localStorage.setItem(LANG_KEY, byId("langBtn").lang);
  } catch (error) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
});
OBJECT_PRESETS.forEach((preset) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = displayName(preset);
  chip.addEventListener("click", () => {
    addObject(preset);
    renderObjects();
  });
  byId("presets").append(chip);
});
byId("addObject").addEventListener("click", () => {
  addObject(NEW_OBJECT);
  renderObjects();
  const lastIndex = activeType().objects.length - 1;
  byId(`objectName-${lastIndex}`).focus();
  byId(`objectName-${lastIndex}`).select();
});
byId("typeForm").addEventListener("input", readForm);
byId("typeForm").addEventListener("change", readForm);
byId("typeForm").addEventListener("submit", (event) => event.preventDefault());
SYSTEM_IDS.forEach((id) => {
  const update = () => updateSystem(id, byId(id).value);
  byId(id).addEventListener("input", update);
  byId(id).addEventListener("change", update);
});
byId("duplicateTypeBtn").addEventListener("click", () => {
  readForm();
  duplicateActiveType(displayName(activeType()) + t("copySuffix"));
  writeForm(activeType());
  toast(t("typeCopied"));
});
let deleteTimer = null;
byId("deleteTypeBtn").addEventListener("click", () => {
  const button = byId("deleteTypeBtn");
  if (state.cameraTypes.length < 2) {
    toast(t("lastType"));
    return;
  }
  if (!deleteTimer) {
    button.textContent = t("deleteTypeConfirm");
    deleteTimer = setTimeout(() => {
      button.textContent = t("deleteTypeBtn");
      deleteTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(deleteTimer);
  deleteTimer = null;
  button.textContent = t("deleteTypeBtn");
  deleteActiveType();
  writeForm(activeType());
  toast(t("typeDeleted"));
});
export function toast(message) {
  const toastEl = byId("toast");
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (toastEl.hidden = true), 1800);
}
byId("resetBtn").addEventListener("click", () => {
  resetToExample();
  buildGpuSelect();
  writeSystemForm();
  writeForm(activeType());
  toast(t("exampleLoaded"));
});
byId("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(reportText()).then(
    () => toast(t("reportCopied")),
    () => toast(t("copyFail")),
  );
});
byId("exportBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([exportText(state)], {
      type: "application/json",
    }),
  );
  link.download = "camera-calc.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
let importTimer = null;
byId("importBtn").addEventListener("click", () => {
  const button = byId("importBtn");
  if (!importTimer) {
    button.textContent = t("importConfirm");
    importTimer = setTimeout(() => {
      button.textContent = t("importBtn");
      importTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(importTimer);
  importTimer = null;
  button.textContent = t("importBtn");
  byId("importFile").click();
});
byId("importFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (file)
    file.text().then(
      (text) => {
        const status = importText(text);
        if (status === "ok") location.reload();
        else toast(t(status));
      },
      () => toast(t("readFail")),
    );
});
const TEMPLATE_VIEWS = {
  "tpl-gpus": renderGpuView,
  "tpl-cams": renderCamView,
  "tpl-dets": renderDetView,
};
export function route() {
  const hash = location.hash.slice(1),
    isTemplate = hash in TEMPLATE_VIEWS;
  byId("viewMain").style.display = isTemplate ? "none" : "flex";
  byId("viewTemplates").hidden = !isTemplate;
  byId("viewTemplates").style.display = isTemplate ? "flex" : "none";
  if (isTemplate) {
    Object.keys(TEMPLATE_VIEWS).forEach((view) => {
      byId("templatePage-" + view.slice(4)).hidden = view !== hash;
      byId("templatePage-" + view.slice(4)).style.display =
        view === hash ? "flex" : "none";
      const link = byId("templateTab-" + view.slice(4));
      if (view === hash) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    TEMPLATE_VIEWS[hash]();
  } else if (hash === "") writeForm(activeType());
  try {
    window.scrollTo(0, 0);
  } catch (error) {}
}
window.addEventListener("hashchange", route);
