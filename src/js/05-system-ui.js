// ---------- расчёт системы
const modelName = (obj) => (modelById(obj.model) || { name: "?" }).name;
const modelGflops = (id) => {
  const model = modelById(id);
  return model && model.gflops > 0 ? model.gflops : 0;
};
// Подбор GPU. Загрузка (load) — доля ресурса GPU, 1 = 100%.
function computeSystem(results) {
  const liveResults = results.filter(
    (result) => !result.err && result.count > 0,
  );
  const efficiency = parseNum(byId("efficiency").value),
    reserve = Math.max(0, parseNum(byId("reserve").value) || 0) / 100,
    maxLoad = 1 / (1 + reserve),
    BATCH_SIZE = 16;
  const groups = liveResults.flatMap((result) =>
    result.groups.map((group) => ({ ...group, typeName: result.type.name })),
  );
  // движок — модель с конкретным входом; в памяти GPU каждый движок один раз
  const engines = [
    ...new Map(
      groups.map((group) => [
        `${group.model}|${group.feedInfo.inputSize}`,
        group,
      ]),
    ).values(),
  ];
  const engineMemoryGB = (engine) => {
    const gflops = modelGflops(engine.model);
    return gflops
      ? 0.15 +
          (BATCH_SIZE * engine.feedInfo.inputSize ** 2 * 3 * 2 * (gflops / 4)) /
            1e9
      : 0.5;
  };
  const evaluateGpu = (gpu, count) => {
    const runs = groups.map((group) => {
      let framesPerSecond;
      const model = modelById(group.model);
      if (!model) return { ...group, bad: true };
      if (MODELS.includes(model)) {
        const inputScale = (640 / group.feedInfo.inputSize) ** 2;
        framesPerSecond =
          ((1000 / model.latencyMs) * inputScale * gpu.tflops) / T4_TFLOPS;
      } else {
        const refGpu = gpuById(model.refGpu) || GPU_CATALOG[0],
          inputScale = (model.inputSize / group.feedInfo.inputSize) ** 2;
        framesPerSecond = (model.fps * inputScale * gpu.tflops) / refGpu.tflops;
      }
      const capacity = framesPerSecond * efficiency;
      return { ...group, capacity, gpusNeeded: group.load / capacity };
    });
    const inferenceGpus = runs
      .filter((run) => !run.bad)
      .reduce((sum, run) => sum + run.gpusNeeded, 0);
    const decodeGpus = liveResults.reduce(
      (sum, result) =>
        sum + result.decUnits / (decStreams(gpu, result.codec) * efficiency),
      0,
    );
    const memoryUseGB =
        0.8 +
        engines.reduce((sum, engine) => sum + engineMemoryGB(engine), 0) +
        liveResults.reduce(
          (sum, result) =>
            sum + Math.ceil(result.count / count) * 20 * result.frameGB,
          0,
        ),
      memoryCapGB = gpu.memoryGB * (gpu.jetson ? 0.6 : 0.9);
    const inferenceLoad = inferenceGpus / count,
      decodeLoad = decodeGpus / count,
      memoryLoad = memoryUseGB / memoryCapGB,
      worstLoad = Math.max(inferenceLoad, decodeLoad, memoryLoad);
    return {
      gpu,
      count,
      runs,
      inferenceGpus,
      decodeGpus,
      inferenceLoad,
      decodeLoad,
      memoryLoad,
      memoryUseGB,
      memoryCapGB,
      worstLoad,
      ok: inferenceLoad <= maxLoad && decodeLoad <= maxLoad && memoryLoad <= 1,
      cost: count * priceOf(gpu),
      bottleneck: t(
        inferenceLoad >= decodeLoad && inferenceLoad >= memoryLoad
          ? "bottInf"
          : decodeLoad >= memoryLoad
            ? "bottDec"
            : "bottMem",
      ),
    };
  };
  const candidates = allGpus().filter(isOn),
    evaluations = [];
  candidates.forEach((gpu) => {
    for (let count = 1; count <= 4; count++)
      evaluations.push(evaluateGpu(gpu, count));
  });
  // подходящие варианты от дешёвых к дорогим, при равной цене — по мощности
  const fitting = evaluations
    .filter((option) => option.ok)
    .sort(
      (a, b) => a.cost - b.cost || a.count * a.gpu.tdpW - b.count * b.gpu.tdpW,
    );
  const optimum = fitting[0],
    gpuChoice = byId("gpu").value,
    countChoice = byId("gpuCount").value;
  const leastLoaded = (options) =>
    options.length
      ? options.reduce((a, b) => (a.worstLoad < b.worstLoad ? a : b))
      : evaluateGpu(allGpus()[0], 1);
  let chosen;
  if (gpuChoice === "auto" && countChoice === "auto")
    chosen = optimum || leastLoaded(evaluations);
  else if (gpuChoice === "auto") {
    const count = +countChoice;
    chosen =
      fitting.find((option) => option.count === count) ||
      leastLoaded(evaluations.filter((option) => option.count === count));
  } else {
    const gpu = gpuById(gpuChoice) || GPU_CATALOG[0];
    if (countChoice === "auto") {
      chosen = null;
      for (let count = 1; count <= 4 && !chosen; count++) {
        const option = evaluateGpu(gpu, count);
        if (option.ok) chosen = option;
      }
      chosen = chosen || evaluateGpu(gpu, 4);
    } else chosen = evaluateGpu(gpu, +countChoice);
  }
  const decodeUnitsTotal = liveResults.reduce(
    (sum, result) => sum + result.decUnits,
    0,
  );
  return {
    liveResults,
    efficiency,
    maxLoad,
    reserve,
    chosen,
    optimum,
    engines,
    decodeUnitsTotal,
    groups,
    noCandidates: !candidates.length,
  };
}

// ---------- отрисовка типа
const STATUS_TEXT = STR.st;
const capitalize = (text) =>
  text ? text[0].toUpperCase() + text.slice(1) : text;
function renderType(result) {
  const verdict = byId("verdict");
  byId("resTitle").textContent = t(
    "resTitleOf",
    result.type.name || t("untitled"),
  );
  if (result.err) {
    verdict.className = "verdict bad";
    verdict.innerHTML = `<span class="pill">${t("pillErr")}</span><div>${t("errInput")}</div>`;
    ["kpis", "dens", "facts", "side"].forEach(
      (id) => (byId(id).innerHTML = ""),
    );
    return;
  }
  verdict.className = "verdict " + result.status;
  verdict.innerHTML = `<span class="pill">${result.pill}</span><div>${escapeHtml(result.headline)}${result.notes.length ? "<ul>" + result.notes.map((note) => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul>" : ""}</div>`;
  const { hfov, vfov, f, rotated, tilt, frameWidthAt, depthAt, x1, x2 } =
    result;
  byId("kpis").innerHTML = [
    [
      t("kF"),
      withUnit(formatNumber(f, 1), "mm"),
      t(
        result.clamped
          ? "kFLimit"
          : result.mode === "auto"
            ? "kFAuto"
            : "kFSet",
      ) + (rotated ? t("kRot") : ""),
    ],
    [
      t(rotated ? "kAngRot" : "kAng"),
      formatNumber(hfov / DEG, 0) + "° × " + formatNumber(vfov / DEG, 0) + "°",
      `DFOV ≈ ${formatNumber((2 * Math.atan(Math.hypot(Math.tan(hfov / 2), Math.tan(vfov / 2)))) / DEG, 0)}°`,
    ],
    [
      t("kTilt"),
      formatNumber(tilt / DEG, 0) + "°",
      t(Math.abs(tilt / DEG - 90) < 1 ? "kTiltDown" : "kTiltHor"),
    ],
    [
      t("kFrame"),
      withUnit(
        formatNumber(frameWidthAt(depthAt(x1)), 1) +
          "–" +
          formatNumber(frameWidthAt(depthAt(x2)), 1),
        "m",
      ),
      t("kFrameSub"),
    ],
  ]
    .map(
      ([label, value, extra]) =>
        `<div class="kpi"><span>${label}</span><strong>${value}</strong><em>${extra}</em></div>`,
    )
    .join("");
  result.objs.forEach((obj, i) => {
    const resultEl = byId(`obj-result-${i}`),
      dotEl = byId(`obj-dot-${i}`);
    if (!resultEl) return;
    if (obj.bad) {
      resultEl.className = "ores";
      resultEl.textContent = t("objBad");
      if (dotEl) dotEl.className = "dot";
      return;
    }
    resultEl.className = "ores " + obj.status;
    if (dotEl) dotEl.className = "dot " + obj.status;
    resultEl.innerHTML = `<b>${capitalize(STATUS_TEXT[obj.status])}</b><span>${t("objSeen", `<span class="mono">${result.modelPxText(obj)}</span>`, formatNumber(obj.requiredPx, 0))}</span><span class="m2">${t("objSensor", result.sensorPxText(obj), escapeHtml(obj.feedInfo.text))}</span>`;
  });
  const top = result.placement === "top";
  byId("dens").innerHTML =
    `<tr><th>${t("densHead")}</th><th>${t("across")}</th><th>${t("depth")}</th></tr>
    <tr><td class="txt">${t(top ? "edgeBack" : "edgeNear")}, ${withUnit(formatNumber(result.edge1.D, 1), "m")}</td><td>${formatNumber(result.edge1.across, 0)}</td><td>${formatNumber(result.edge1.depth, 0)}</td></tr>
    <tr><td class="txt">${t(top ? "edgeFwd" : "edgeFar")}, ${withUnit(formatNumber(result.edge2.D, 1), "m")}</td><td>${formatNumber(result.edge2.across, 0)}</td><td>${formatNumber(result.edge2.depth, 0)}</td></tr>`;
  const doriLevels = [25, 62, 125, 250],
    doriNames = STR.dori;
  let doriLevel = -1;
  doriLevels.forEach((level, i) => {
    if (result.minAcross >= level) doriLevel = i;
  });
  const shutter = result.shutterDenominator;
  byId("facts").innerHTML =
    `<span>DORI: <b>${doriLevel < 0 ? t("doriBelow") : doriNames[doriLevel]}</b> (${withUnit(formatNumber(result.minAcross, 0), "pxm")})</span><span>${t("exposure")} <b class="mono">${isFinite(shutter) && shutter > 0 ? withUnit("1/" + Math.ceil(shutter), "s") : "—"}</b></span><span>${t("camera")}: <b>${escapeHtml(result.cameraLabel)}</b></span>`;
  drawSide({
    H: result.H,
    h: result.h,
    x1: result.x1,
    x2: result.x2,
    tilt: result.tilt,
    vfov: result.vfov,
    Hc: result.Hc,
    placement: result.placement,
    frameWidthNear: frameWidthAt(depthAt(x1)),
    frameWidthFar: frameWidthAt(depthAt(x2)),
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
    tab.setAttribute("aria-selected", String(result.type.id === activeTypeId));
    tab.setAttribute("aria-controls", "typeOut");
    tab.innerHTML = `<span class="dot ${result.err ? "bad" : result.status}" aria-hidden="true"></span><b>${escapeHtml(result.type.name || t("untitled"))}</b><small>× ${result.count}</small>`;
    tab.title = result.err
      ? t("tabErr")
      : t("tabObjs", STATUS_TEXT[result.status] || result.pill);
    tab.addEventListener("click", () => {
      if (activeTypeId === result.type.id) return;
      activeTypeId = result.type.id;
      writeForm(activeType());
      calcAll();
    });
    nav.append(tab);
  });
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "tab ghost";
  addButton.textContent = t("addType");
  addButton.addEventListener("click", () => {
    const type = makeType(t("newType", cameraTypes.length + 1), 1, {}, [
      OBJECT_PRESETS[0],
    ]);
    cameraTypes.push(type);
    activeTypeId = type.id;
    writeForm(type);
    calcAll();
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
function renderSystem(results, system) {
  const { chosen, optimum, efficiency, maxLoad, liveResults } = system;
  const percent = (share) => formatNumber(share * 100, 0) + "%";
  const cameraCount = results.reduce((sum, result) => sum + result.count, 0);
  const allObjects = results.flatMap((result) => result.valid || []),
    okObjects = allObjects.filter((obj) => obj.status === "ok").length;
  const worstStatus = results.some(
    (result) => result.err || result.status === "bad",
  )
    ? "bad"
    : results.some((result) => result.status === "warn")
      ? "warn"
      : "ok";
  const smallest = allObjects.length
    ? allObjects.reduce((a, b) => (a.modelPx < b.modelPx ? a : b))
    : null;
  const totalMbps = liveResults.reduce(
    (sum, result) => sum + result.bitrateMbps * result.count,
    0,
  );
  const cameraCost = results.reduce((sum, result) => {
    const camera = cameraById(result.type.inputs.camera);
    return sum + (camera && camera.price > 0 ? camera.price * result.count : 0);
  }, 0);
  const port =
    totalMbps * 1.3 < 900
      ? withUnit(1, "gbps")
      : totalMbps * 1.3 < 9000
        ? withUnit(10, "gbps")
        : "> " + withUnit(10, "gbps");
  byId("sysKpis").innerHTML = [
    [
      t("sCams"),
      `${cameraCount}`,
      cameraCost
        ? t("sTypes", results.length) +
          t("sCamCost", "$" + formatNumber(cameraCost, 0))
        : t(
            "sTypes",
            results.length,
            results.map((result) => result.type.name).join(", "),
          ),
    ],
    [
      t("sObjs"),
      `<span class="dot ${worstStatus}" aria-hidden="true"></span>${t("sOfN", okObjects, allObjects.length)}`,
      smallest
        ? t(
            "sSmallest",
            smallest.name,
            formatNumber(
              Math.min(smallest.widthPx, smallest.heightPx) *
                smallest.feedInfo.modelScale,
              1,
            ),
          )
        : t("sNoObjs"),
    ],
    [
      t("sCompute"),
      liveResults.length
        ? `${chosen.count} × ${escapeHtml(chosen.gpu.name)}`
        : "—",
      liveResults.length
        ? `$${formatNumber(chosen.cost, 0)} · ${chosen.ok ? t(chosen === optimum ? "optimum" : "manual") + " · " + t("headroom", percent(Math.max(0, 1 - chosen.worstLoad))) : t("insufficient")}`
        : t("sNoCams"),
    ],
    [
      t("sNet"),
      `${withUnit(formatNumber(totalMbps, 0), "mbps")}`,
      t("sPort", port, formatNumber(cameraCount * 15.4, 0)),
    ],
  ]
    .map(
      ([label, value, extra]) =>
        `<div class="sk"><span>${label}</span><strong>${value}</strong><em>${escapeHtml(extra)}</em></div>`,
    )
    .join("");
  // дашборд
  const overloaded = chosen.inferenceLoad > maxLoad;
  byId("dsum").innerHTML = liveResults.length
    ? `<b>${chosen.count} × ${escapeHtml(chosen.gpu.name)}</b> · $${formatNumber(chosen.cost, 0)} · ${chosen.ok ? t(chosen === optimum ? "optimum" : "manual") : `<span style="color:var(--bad)">${t("insufficient")}</span>`}<br>${t("headroom", percent(Math.max(0, 1 - chosen.worstLoad)))} · ${t("bottleneck", chosen.bottleneck)}`
    : "";
  const runs = chosen.runs
    .filter((run) => !run.bad)
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
      `<text x="60" y="61" text-anchor="middle" class="big" style="fill:${overloaded ? "var(--bad)" : "var(--fg)"}">${percent(chosen.inferenceLoad)}</text><text x="60" y="77" text-anchor="middle" class="cap">${t("donutCap")}</text>`
    : "";
  byId("donut").setAttribute(
    "aria-label",
    t("donutAriaVal", percent(chosen.inferenceLoad), percent(maxLoad)),
  );
  byId("legend").innerHTML = liveResults.length
    ? shown
        .map(
          (run, i) =>
            `<li><span class="sw" style="background:${RUN_COLORS[i]}"></span><span>${escapeHtml(modelName(run))} · ${FEED_SHORT[run.feed]} ${run.feedInfo.inputSize}<span class="sub">${escapeHtml(run.typeName)}: ${escapeHtml(run.names.join(", "))} · ${withUnit(formatNumber(run.load, 0), "fps")}</span></span><span class="pc">${percent(run.share)}</span></li>`,
        )
        .join("") +
      (rest.length
        ? `<li><span class="sw" style="background:var(--c6)"></span><span>${t("otherRuns", rest.length)}</span><span class="pc">${percent(restShare)}</span></li>`
        : "") +
      `<li><span class="sw" style="background:var(--track)"></span><span>${t("free")}<span class="sub">${t("freeSub", percent(maxLoad))}</span></span><span class="pc">${percent(Math.max(0, 1 - chosen.inferenceLoad))}</span></li>`
    : `<li class="note">${t("noLoad")}</li>`;
  const decodeCapacity =
    (chosen.count * system.decodeUnitsTotal) / (chosen.decodeGpus || 1);
  const gauge = (label, load, limit, center, sub) =>
    `<div class="gauge"><svg viewBox="0 0 84 84" role="img" aria-label="${label}: ${center}">${ring(42, 42, 32, 9, [{ fraction: load, color: load > limit ? "var(--bad)" : "var(--meter)" }], limit < 1 ? limit : null)}<text x="42" y="48" text-anchor="middle" class="mid" style="font-size:17px">${center}</text></svg><span><b>${label}</b>${sub}</span></div>`;
  byId("gauges").innerHTML = liveResults.length
    ? gauge(
        t("gDec"),
        chosen.decodeLoad,
        maxLoad,
        percent(chosen.decodeLoad),
        t(
          "gDecSub",
          formatNumber(system.decodeUnitsTotal, 1),
          formatNumber(decodeCapacity, 0),
        ),
      ) +
      gauge(
        t("gMem"),
        chosen.memoryLoad,
        1,
        percent(chosen.memoryLoad),
        t(
          "gMemSub",
          formatNumber(chosen.memoryUseGB, 1),
          formatNumber(chosen.memoryCapGB, 0),
        ),
      )
    : "";
  const warning = system.noCandidates
    ? t("noCand")
    : !optimum && liveResults.length
      ? t("noFit")
      : "";
  byId("loadNote").innerHTML = warning
    ? `<span style="color:var(--bad)">${escapeHtml(warning)}</span>`
    : liveResults.length && STR.gpuNotes[chosen.gpu.id]
      ? escapeHtml(STR.gpuNotes[chosen.gpu.id])
      : "";
  byId("loadNote").hidden = !byId("loadNote").innerHTML;
  // сеть
  const archiveDays = parseNum(byId("archiveDays").value) || 0,
    archiveTB = (((totalMbps * 1e6) / 8) * 86400 * archiveDays) / 1e12;
  byId("netTbl").innerHTML =
    `<tr>${["nType", "nCams", "nRes", "nFps", "nPerCam", "nAll"].map((key) => `<th>${t(key)}</th>`).join("")}</tr>` +
    results
      .map((result) =>
        result.err
          ? `<tr><td class="txt">${escapeHtml(result.type.name)}</td><td>${result.count}</td><td colspan="4" class="dim" style="text-align:left">${t("tabErr")}</td></tr>`
          : `<tr><td class="txt">${escapeHtml(result.type.name)}</td><td>${result.count}</td><td>${result.Nw} × ${result.Nh}</td><td>${formatNumber(result.fps, 0)}</td><td>${withUnit(formatNumber(result.bitrateMbps, 1), "mbps")}</td><td>${withUnit(formatNumber(result.bitrateMbps * result.count, 0), "mbps")}</td></tr>`,
      )
      .join("") +
    `<tr class="total"><td class="txt">${t("nTotal")}</td><td>${cameraCount}</td><td></td><td></td><td></td><td>${withUnit(formatNumber(totalMbps, 0), "mbps")}</td></tr>` +
    `<tr><td class="txt dim">${t("nArch")}</td><td colspan="5" class="dim">${archiveDays > 0 ? t("nArchVal", formatNumber(archiveTB, 1), formatNumber(archiveDays, 0)) : t("nArchOff")}</td></tr>`;
  byId("assList").innerHTML = t("ass", formatNumber(efficiency, 2))
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return { cameraCount, totalMbps, cameraCost };
}

// ---------- шаблоны: видеокарты
function buildGpuSelect() {
  const select = byId("gpu"),
    current = select.value || "auto";
  select.innerHTML =
    `<option value="auto">${t("gpuAuto")}</option>` +
    allGpus()
      .map(
        (gpu) =>
          `<option value="${gpu.id}">${escapeHtml(gpu.name)}${gpu.custom ? t("gpuCustomMark") : ""}</option>`,
      )
      .join("");
  select.value = allGpus().some((gpu) => gpu.id === current) ? current : "auto";
  const refSelect = byId("ndRef");
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
  ) => `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(gpu.name)}</b><span class="sub">${gpu.jetson ? t("gJet") : escapeHtml(gpu.arch)}${gpu.custom ? " · " + t("gOwn") : ""}</span></td><td>${formatNumber(gpu.tflops, 1)}</td><td>${decText(gpu)}</td><td>${withUnit(formatNumber(gpu.memoryGB, 0), "gb")}</td><td>${gpu.tdpW ? withUnit(formatNumber(gpu.tdpW, 0), "w") : "—"}</td>
    <td><input id="pr-${gpu.id}" value="${escapeHtml(gpuPrices[gpu.id] ?? gpu.price)}" type="number" step="1" inputmode="numeric" aria-label="${escapeHtml(t("gPriceAria", gpu.name))}"></td>
    <td style="text-align:center"><input type="checkbox" id="gon-${gpu.id}" ${isOn(gpu) ? "checked" : ""} aria-label="${escapeHtml(t("gOnAria", gpu.name))}"></td>
    ${gpu.custom ? `<td><button type="button" class="sm" data-delg="${gpu.id}" aria-label="${escapeHtml(t("delAria", gpu.name))}">${t("del")}</button></td>` : "<td></td>"}</tr>`;
  const headers = STR.gHead,
    head = `<tr>${headers
      .slice(0, 6)
      .map((header) => `<th>${header}</th>`)
      .join("")}<th style="text-align:center">${headers[6]}</th><th></th></tr>`;
  byId("catTitle").textContent = t("catTitle", GPU_CATALOG.length);
  byId("catTbl").innerHTML = head + GPU_CATALOG.map(row).join("");
  byId("mine").innerHTML = customGpus.length
    ? `<strong style="font-weight:600">${t("mineN", customGpus.length)}</strong><div class="tbl"><table>${head}${customGpus.map(row).join("")}</table></div>`
    : `<strong style="font-weight:600">${t("mine0")}</strong><span class="note" style="font-size:13px">${t("mineEmpty")}</span>`;
  allGpus().forEach((gpu) => {
    byId(`pr-${gpu.id}`).addEventListener("input", (event) => {
      gpuPrices[gpu.id] = event.target.value;
      calcAll();
    });
    byId(`gon-${gpu.id}`).addEventListener("change", (event) => {
      gpuEnabled[gpu.id] = event.target.checked;
      calcAll();
    });
  });
  document.querySelectorAll("[data-delg]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.delg;
      customGpus = customGpus.filter((gpu) => gpu.id !== id);
      delete gpuPrices[id];
      delete gpuEnabled[id];
      customDetectors.forEach((detector) => {
        if (detector.refGpu === id) detector.refGpu = "5090";
      });
      buildGpuSelect();
      renderGpuView();
      calcAll();
      toast(t("gDeleted"));
    }),
  );
}
byId("ngArch").addEventListener("change", () => {
  const isJetson = byId("ngArch").value === "jet";
  byId("ngDecL").textContent = t(isJetson ? "ngDecJet" : "ngDec");
  byId("ngDec").placeholder = isJetson ? "22" : "2";
});
byId("newForm").addEventListener("submit", (event) => {
  event.preventDefault();
  // decode — число NVDEC, у Jetson — потоков 1080p30 H.265
  const name = byId("ngName").value.trim(),
    arch = byId("ngArch").value,
    tflops = parseNum(byId("ngTf").value),
    decode = parseNum(byId("ngDec").value),
    memoryGB = parseNum(byId("ngMem").value),
    tdpW = parseNum(byId("ngTdp").value),
    price = parseNum(byId("ngPrice").value);
  const errors = [];
  if (!name) errors.push(t("eName"));
  if (!(tflops > 0)) errors.push(t("eTf"));
  if (!(decode > 0)) errors.push(t(arch === "jet" ? "eDecJet" : "eDec"));
  if (!(memoryGB > 0)) errors.push(t("eMem"));
  if (!(price > 0)) errors.push(t("ePrice"));
  const errorEl = byId("ngErr");
  if (errors.length) {
    errorEl.hidden = false;
    errorEl.textContent = t("ngErr", errors.join(", "));
    return;
  }
  errorEl.hidden = true;
  const gpu = {
    id: "c" + uid(),
    name,
    arch: arch === "jet" ? "Ampere" : arch,
    tflops,
    memoryGB,
    tdpW: tdpW > 0 ? tdpW : 0,
    price,
    custom: true,
  };
  if (arch === "jet") {
    gpu.jetson = true;
    gpu.decodeStreams = {
      h265: decode,
      h264: +((decode * 748) / 1415).toFixed(1),
    };
  } else gpu.nvdec = Math.round(decode);
  customGpus.push(gpu);
  gpuEnabled[gpu.id] = byId("ngOn").checked;
  ["ngName", "ngTf", "ngDec", "ngMem", "ngTdp", "ngPrice"].forEach(
    (id) => (byId(id).value = ""),
  );
  buildGpuSelect();
  renderGpuView();
  calcAll();
  toast(t("gAdded", name));
});

// ---------- шаблоны: камеры
function renderCamView() {
  const used = (id) =>
    cameraTypes
      .filter((type) => type.inputs.camera === id)
      .reduce((sum, type) => sum + (Math.round(parseNum(type.count)) || 0), 0);
  byId("camTitle").textContent = t("camTitle", allCameras().length);
  byId("camTbl").innerHTML =
    `<tr>${STR.cHead.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    allCameras()
      .map(
        (camera) =>
          `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(camera.name)}</b><span class="sub">${t(camera.custom ? "cOwn" : "cBuiltin")}</span></td><td>${camera.Nw} × ${camera.Nh}</td><td>${withUnit(formatNumber(camera.sensorWidth, 2), "mm")}</td><td>${camera.focalMin > 0 ? (camera.focalMin === camera.focalMax ? withUnit(formatNumber(camera.focalMin, 1), "mm") : withUnit(formatNumber(camera.focalMin, 1) + "–" + formatNumber(camera.focalMax, 1), "mm")) : t("cAny")}</td><td>${camera.price > 0 ? "$" + formatNumber(camera.price, 0) : "—"}</td><td>${used(camera.id)}</td><td>${camera.custom ? `<button type="button" class="sm" data-delc="${camera.id}" aria-label="${escapeHtml(t("delAria", camera.name))}">${t("del")}</button>` : ""}</td></tr>`,
      )
      .join("");
  document.querySelectorAll("[data-delc]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.delc;
      customCameras = customCameras.filter((camera) => camera.id !== id);
      cameraTypes.forEach((type) => {
        if (type.inputs.camera === id) type.inputs.camera = "";
      });
      buildCameraSelect();
      writeForm(activeType());
      renderCamView();
      calcAll();
      toast(t("cDeleted"));
    }),
  );
}
byId("camForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId("ncName").value.trim(),
    Nw = Math.round(parseNum(byId("ncW").value)),
    Nh = Math.round(parseNum(byId("ncH").value)),
    pixelPitchUm = parseNum(byId("ncPp").value);
  let sensorWidth = parseNum(byId("ncSw").value);
  let focalMin = parseNum(byId("ncFmin").value),
    focalMax = parseNum(byId("ncFmax").value);
  const price = parseNum(byId("ncPrice").value);
  if (!(sensorWidth > 0) && pixelPitchUm > 0 && Nw > 0)
    sensorWidth = +((pixelPitchUm * Nw) / 1000).toFixed(3);
  if (focalMin > 0 && !(focalMax > 0)) focalMax = focalMin;
  if (focalMax > 0 && !(focalMin > 0)) focalMin = focalMax;
  const errors = [];
  if (!name) errors.push(t("eName"));
  if (!(Nw > 0 && Nh > 0)) errors.push(t("eFrame"));
  if (!(sensorWidth > 0)) errors.push(t("eSw"));
  if (focalMin > 0 && focalMax > 0 && focalMin > focalMax)
    errors.push(t("eFRange"));
  const errorEl = byId("ncErr");
  if (errors.length) {
    errorEl.hidden = false;
    errorEl.textContent = t("ncErr", errors.join(", "));
    return;
  }
  errorEl.hidden = true;
  customCameras.push({
    id: "m" + uid(),
    name,
    Nw,
    Nh,
    sensorWidth,
    focalMin: focalMin > 0 ? focalMin : 0,
    focalMax: focalMax > 0 ? focalMax : 0,
    price: price > 0 ? price : 0,
    custom: true,
  });
  [
    "ncName",
    "ncW",
    "ncH",
    "ncSw",
    "ncPp",
    "ncFmin",
    "ncFmax",
    "ncPrice",
  ].forEach((id) => (byId(id).value = ""));
  buildCameraSelect();
  renderCamView();
  save();
  toast(t("cAdded", name));
});

// ---------- шаблоны: детекторы
function renderDetView() {
  byId("detTitle").textContent = t(
    "detTitle",
    MODELS.length + customDetectors.length,
  );
  const used = (id) =>
    cameraTypes.reduce(
      (sum, type) =>
        sum + type.objects.filter((obj) => obj.model === id).length,
      0,
    );
  byId("detTbl").innerHTML =
    `<tr>${STR.dHead.map((header) => `<th>${header}</th>`).join("")}<th></th></tr>` +
    (customDetectors.length
      ? customDetectors
          .map((detector) => {
            const refGpu = gpuById(detector.refGpu);
            return `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(detector.name)}</b><span class="sub">${t("dOwn")}</span></td><td>${detector.inputSize}</td><td>${detector.gflops > 0 ? formatNumber(detector.gflops, 1) : "—"}</td><td>${t("dSpeed", formatNumber(detector.fps, 0), escapeHtml(refGpu ? refGpu.name : "?"))}</td><td>${used(detector.id)}</td><td><button type="button" class="sm" data-deld="${detector.id}" aria-label="${escapeHtml(t("delAria", detector.name))}">${t("del")}</button></td></tr>`;
          })
          .join("")
      : `<tr><td class="txt dim" colspan="6">${t("dEmpty")}</td></tr>`) +
    MODELS.map(
      (model) =>
        `<tr><td class="txt">${model.name}<span class="sub">${t("dCatalog")}</span></td><td>640</td><td>${formatNumber(model.gflops, 1)}</td><td>${t("dSpeed", formatNumber(1000 / model.latencyMs, 0), "T4")}</td><td>${used(model.id)}</td><td></td></tr>`,
    ).join("");
  document.querySelectorAll("[data-deld]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.deld;
      customDetectors = customDetectors.filter(
        (detector) => detector.id !== id,
      );
      cameraTypes.forEach((type) =>
        type.objects.forEach((obj) => {
          if (obj.model === id) obj.model = "y26s";
        }),
      );
      renderObjects();
      renderDetView();
      calcAll();
      toast(t("dDeleted"));
    }),
  );
}
byId("ndInp").innerHTML = INPUTS.map(
  (size) => `<option${size === 640 ? " selected" : ""}>${size}</option>`,
).join("");
byId("detForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = byId("ndName").value.trim(),
    fps = parseNum(byId("ndFps").value),
    inputSize = +byId("ndInp").value,
    refGpu = byId("ndRef").value,
    gflops = parseNum(byId("ndGf").value);
  const errors = [];
  if (!name) errors.push(t("eName"));
  if (!(fps > 0)) errors.push(t("eFps"));
  const errorEl = byId("ndErr");
  if (errors.length) {
    errorEl.hidden = false;
    errorEl.textContent = t("ncErr", errors.join(", "));
    return;
  }
  errorEl.hidden = true;
  customDetectors.push({
    id: "d" + uid(),
    name,
    fps,
    inputSize,
    refGpu,
    gflops: gflops > 0 ? gflops : 0,
    custom: true,
  });
  ["ndName", "ndFps", "ndGf"].forEach((id) => (byId(id).value = ""));
  renderObjects();
  renderDetView();
  calcAll();
  toast(t("dAdded", name));
});

// ---------- главный цикл
let report = "";
function calcAll() {
  const results = cameraTypes.map(computeType);
  const activeIndex = Math.max(
    0,
    cameraTypes.findIndex((type) => type.id === activeTypeId),
  );
  syncFormUI(cameraTypes[activeIndex], results[activeIndex]);
  renderType(results[activeIndex]);
  renderTabs(results);
  const system = computeSystem(results);
  const systemTotals = renderSystem(results, system);
  const chosen = system.chosen;
  report = [
    t("appTitle"),
    ...results.flatMap((result) =>
      result.err
        ? ["\n" + t("rErr", result.type.name, result.count)]
        : [
            `\n${result.type.name} × ${result.count}`,
            t("rCam", {
              rl: result.cameraLabel,
              rot: result.rotated,
              s: formatNumber(result.s, 2),
              f: formatNumber(result.f, 1),
              hf: formatNumber(result.hfov / DEG, 0),
              tilt: formatNumber(result.tilt / DEG, 0),
              top: result.placement === "top",
              L0: formatNumber(result.zoneStart, 2),
              H: formatNumber(result.H, 2),
              Wz: formatNumber(result.zoneWidth, 2),
              Dz: formatNumber(result.zoneDepth, 2),
            }),
            ...result.valid.map((obj) =>
              t("rObj", {
                name: obj.name,
                model: modelName(obj),
                feed: obj.feedInfo.text,
                pxs: result.sensorPxText(obj),
                pxm: result.modelPxText(obj),
                req: formatNumber(obj.requiredPx, 0),
                st: STATUS_TEXT[obj.status],
              }),
            ),
            t(
              "rStream",
              formatNumber(result.bitrateMbps, 1),
              Math.ceil(result.shutterDenominator),
            ),
          ],
    ),
    "\n" +
      t(
        "rSys",
        systemTotals.cameraCount,
        formatNumber(systemTotals.totalMbps, 0),
        systemTotals.cameraCost
          ? "$" + formatNumber(systemTotals.cameraCost, 0)
          : "",
      ),
    system.liveResults.length
      ? t("rCompute", {
          n: chosen.count,
          g: chosen.gpu.name,
          cost: "$" + formatNumber(chosen.cost, 0),
          uI: formatNumber(chosen.inferenceLoad * 100, 0),
          uD: formatNumber(chosen.decodeLoad * 100, 0),
          mem: formatNumber(chosen.memoryUseGB, 1),
          cap: formatNumber(chosen.memoryCapGB, 0),
          best:
            system.optimum && system.optimum !== chosen
              ? `${system.optimum.count} × ${system.optimum.gpu.name}, $${formatNumber(system.optimum.cost, 0)}`
              : "",
        })
      : t("rNoCompute"),
  ].join("\n");
  save();
}
const SYSTEM_IDS = ["efficiency", "reserve", "archiveDays", "gpu", "gpuCount"];
const snapshot = () => ({
  types: cameraTypes,
  activeTypeId,
  system: Object.fromEntries(SYSTEM_IDS.map((id) => [id, byId(id).value])),
  gpuPrices,
  gpuEnabled,
  customGpus,
  customCameras,
  customDetectors,
  light: document.documentElement.classList.contains("light"),
});
let stale = false;
const STALE_MSG = t("stale");
addEventListener("storage", (event) => {
  if (event.key === "camcalc4") {
    stale = true;
    toast(STALE_MSG);
  }
});
function save() {
  if (stale) {
    toast(STALE_MSG);
    return;
  }
  try {
    localStorage.setItem("camcalc4", JSON.stringify(snapshot()));
  } catch (error) {}
}
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("camcalc4") || "null");
    if (!saved) return;
    // старые сохранения: числа с десятичной запятой → нейтральный вид 1.5
    const withDot = (value) =>
      typeof value === "string" ? value.replace(",", ".") : value;
    const allWithDot = (values) =>
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, withDot(value)]),
      );
    const shownName = (item) =>
      (item.nameKey && builtinName(item.nameKey)) || item.name;
    if (Array.isArray(saved.customGpus))
      customGpus = saved.customGpus
        .filter((gpu) => gpu && gpu.id && gpu.name && gpu.tflops > 0)
        .map((gpu) => ({ ...gpu, custom: true }));
    if (Array.isArray(saved.customCameras))
      customCameras = saved.customCameras
        .filter(
          (camera) =>
            camera &&
            camera.id &&
            camera.Nw > 0 &&
            camera.Nh > 0 &&
            camera.sensorWidth > 0,
        )
        .map((camera) => ({ ...camera, custom: true }));
    if (Array.isArray(saved.customDetectors))
      customDetectors = saved.customDetectors
        .filter((detector) => detector && detector.id && detector.fps > 0)
        .map((detector) => ({ ...detector, custom: true }));
    if (saved.gpuPrices && typeof saved.gpuPrices === "object")
      gpuPrices = allWithDot(saved.gpuPrices);
    if (saved.gpuEnabled && typeof saved.gpuEnabled === "object")
      gpuEnabled = saved.gpuEnabled;
    if (saved.light) setTheme(true);
    buildGpuSelect();
    buildCameraSelect();
    if (Array.isArray(saved.types) && saved.types.length) {
      cameraTypes = saved.types.map((type) => ({
        id: type.id || uid(),
        name: shownName(type),
        nameKey: type.nameKey,
        count: withDot(type.count),
        inputs: allWithDot({ ...DEFAULT_INPUTS, ...type.inputs }),
        objects: (type.objects || []).map((obj) => ({
          ...makeObject([
            shownName(obj),
            withDot(obj.width),
            withDot(obj.length),
            withDot(obj.height),
            withDot(obj.requiredPx),
            modelById(obj.model) ? obj.model : "y26s",
            obj.feed,
            obj.inputSize,
            obj.nameKey,
          ]),
          overlap: withDot(obj.overlap ?? 20),
        })),
      }));
      activeTypeId = cameraTypes.some((type) => type.id === saved.activeTypeId)
        ? saved.activeTypeId
        : cameraTypes[0].id;
    }
    if (saved.system)
      SYSTEM_IDS.forEach((id) => {
        const field = byId(id);
        if (saved.system[id] != null) field.value = withDot(saved.system[id]);
        if (field.tagName === "SELECT" && field.selectedIndex < 0)
          field.value = "auto";
      });
  } catch (error) {}
}

// ---------- события
function setTheme(light) {
  document.documentElement.classList.toggle("light", light);
  byId("themeBtn").textContent = t(light ? "themeDark" : "themeLight");
  byId("themeBtn").setAttribute("aria-pressed", String(light));
}
byId("themeBtn").addEventListener("click", () => {
  setTheme(!document.documentElement.classList.contains("light"));
  save();
});
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
  chip.textContent = preset[0];
  chip.addEventListener("click", () => {
    activeType().objects.push(makeObject(preset));
    renderObjects();
    calcAll();
  });
  byId("presets").append(chip);
});
byId("addObj").addEventListener("click", () => {
  const type = activeType();
  type.objects.push(
    makeObject([
      t("objDefault"),
      10,
      10,
      10,
      20,
      "y26s",
      "roi",
      640,
      "objDefault",
    ]),
  );
  renderObjects();
  calcAll();
  const lastIndex = type.objects.length - 1;
  byId(`obj-name-${lastIndex}`).focus();
  byId(`obj-name-${lastIndex}`).select();
});
byId("frm").addEventListener("input", () => {
  readForm();
  calcAll();
});
byId("frm").addEventListener("change", () => {
  readForm();
  calcAll();
});
byId("frm").addEventListener("submit", (event) => event.preventDefault());
SYSTEM_IDS.forEach((id) => {
  byId(id).addEventListener("input", calcAll);
  byId(id).addEventListener("change", calcAll);
});
byId("dupBtn").addEventListener("click", () => {
  readForm();
  const source = activeType(),
    copy = JSON.parse(JSON.stringify(source));
  copy.id = uid();
  copy.name = source.name + t("copySuffix");
  delete copy.nameKey;
  cameraTypes.splice(cameraTypes.indexOf(source) + 1, 0, copy);
  activeTypeId = copy.id;
  writeForm(copy);
  calcAll();
  toast(t("typeCopied"));
});
let deleteTimer = null;
byId("delBtn").addEventListener("click", () => {
  const button = byId("delBtn");
  if (cameraTypes.length < 2) {
    toast(t("lastType"));
    return;
  }
  if (!deleteTimer) {
    button.textContent = t("delConfirm");
    deleteTimer = setTimeout(() => {
      button.textContent = t("delBtn");
      deleteTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(deleteTimer);
  deleteTimer = null;
  button.textContent = t("delBtn");
  const index = cameraTypes.findIndex((type) => type.id === activeTypeId);
  cameraTypes.splice(index, 1);
  activeTypeId = cameraTypes[Math.max(0, index - 1)].id;
  writeForm(activeType());
  calcAll();
  toast(t("typeDeleted"));
});
function toast(message) {
  const toastEl = byId("toast");
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (toastEl.hidden = true), 1800);
}
byId("resetBtn").addEventListener("click", () => {
  cameraTypes = exampleTypes();
  activeTypeId = cameraTypes[0].id;
  byId("efficiency").value = "0.6";
  byId("reserve").value = "20";
  byId("archiveDays").value = "0";
  byId("gpuCount").value = "auto";
  gpuPrices = {};
  gpuEnabled = {};
  buildGpuSelect();
  byId("gpu").value = "auto";
  writeForm(activeType());
  calcAll();
  toast(t("exampleLoaded"));
});
byId("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(report).then(
    () => toast(t("reportCopied")),
    () => toast(t("copyFail")),
  );
});
byId("expBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob([JSON.stringify(snapshot(), null, 1)], {
      type: "application/json",
    }),
  );
  link.download = "camera-calc.json";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 0);
});
function importText(text) {
  let saved;
  try {
    saved = JSON.parse(text);
  } catch (error) {}
  const isObject = (value) => value && typeof value === "object";
  if (
    !isObject(saved) ||
    !Array.isArray(saved.types) ||
    !saved.types.length ||
    !saved.types.every(
      (type) =>
        isObject(type) &&
        typeof type.name === "string" &&
        (type.objects == null ||
          (Array.isArray(type.objects) && type.objects.every(isObject))),
    ) ||
    !["customGpus", "customCameras", "customDetectors"].every((key) =>
      Array.isArray(saved[key]),
    ) ||
    !isObject(saved.gpuPrices) ||
    !isObject(saved.gpuEnabled)
  ) {
    toast(t("badFile"));
    return;
  }
  try {
    localStorage.setItem("camcalc4", JSON.stringify(saved));
  } catch (error) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
}
let importTimer = null;
byId("impBtn").addEventListener("click", () => {
  const button = byId("impBtn");
  if (!importTimer) {
    button.textContent = t("impConfirm");
    importTimer = setTimeout(() => {
      button.textContent = t("impBtn");
      importTimer = null;
    }, 3000);
    return;
  }
  clearTimeout(importTimer);
  importTimer = null;
  button.textContent = t("impBtn");
  byId("impFile").click();
});
byId("impFile").addEventListener("change", (event) => {
  const file = event.target.files[0];
  event.target.value = "";
  if (file) file.text().then(importText, () => toast(t("readFail")));
});
const TEMPLATE_VIEWS = {
  "tpl-gpus": renderGpuView,
  "tpl-cams": renderCamView,
  "tpl-dets": renderDetView,
};
function route() {
  const hash = location.hash.slice(1),
    isTemplate = hash in TEMPLATE_VIEWS;
  byId("viewMain").style.display = isTemplate ? "none" : "flex";
  byId("viewTpl").hidden = !isTemplate;
  byId("viewTpl").style.display = isTemplate ? "flex" : "none";
  if (isTemplate) {
    Object.keys(TEMPLATE_VIEWS).forEach((view) => {
      byId(view + "-v").hidden = view !== hash;
      byId(view + "-v").style.display = view === hash ? "flex" : "none";
      const link = byId("tt-" + view.slice(4));
      if (view === hash) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    TEMPLATE_VIEWS[hash]();
  } else if (hash === "") (writeForm(activeType()), calcAll());
  try {
    window.scrollTo(0, 0);
  } catch (error) {}
}
window.addEventListener("hashchange", route);
