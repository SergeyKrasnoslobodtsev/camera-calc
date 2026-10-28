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
      U(formatNumber(f, 1), "mm"),
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
      U(
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
    <tr><td class="txt">${t(top ? "edgeBack" : "edgeNear")}, ${U(formatNumber(result.edge1.D, 1), "m")}</td><td>${formatNumber(result.edge1.across, 0)}</td><td>${formatNumber(result.edge1.depth, 0)}</td></tr>
    <tr><td class="txt">${t(top ? "edgeFwd" : "edgeFar")}, ${U(formatNumber(result.edge2.D, 1), "m")}</td><td>${formatNumber(result.edge2.across, 0)}</td><td>${formatNumber(result.edge2.depth, 0)}</td></tr>`;
  const doriLevels = [25, 62, 125, 250],
    doriNames = STR.dori;
  let doriLevel = -1;
  doriLevels.forEach((level, i) => {
    if (result.minAcross >= level) doriLevel = i;
  });
  const shutter = result.shutterDenominator;
  byId("facts").innerHTML =
    `<span>DORI: <b>${doriLevel < 0 ? t("doriBelow") : doriNames[doriLevel]}</b> (${U(formatNumber(result.minAcross, 0), "pxm")})</span><span>${t("exposure")} <b class="mono">${isFinite(shutter) && shutter > 0 ? U("1/" + Math.ceil(shutter), "s") : "—"}</b></span><span>${t("camera")}: <b>${escapeHtml(result.cameraLabel)}</b></span>`;
  drawSide({
    H: result.H,
    h: result.h,
    x1: result.x1,
    x2: result.x2,
    tilt: result.tilt,
    vf: result.vfov,
    Hc: result.Hc,
    pos: result.placement,
    wN: frameWidthAt(depthAt(x1)),
    wF: frameWidthAt(depthAt(x2)),
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
      ? U(1, "gbps")
      : totalMbps * 1.3 < 9000
        ? U(10, "gbps")
        : "> " + U(10, "gbps");
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
      `${U(formatNumber(totalMbps, 0), "mbps")}`,
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
            `<li><span class="sw" style="background:${RUN_COLORS[i]}"></span><span>${escapeHtml(modelName(run))} · ${FEED_SHORT[run.feed]} ${run.feedInfo.inputSize}<span class="sub">${escapeHtml(run.typeName)}: ${escapeHtml(run.names.join(", "))} · ${U(formatNumber(run.load, 0), "fps")}</span></span><span class="pc">${percent(run.share)}</span></li>`,
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
          : `<tr><td class="txt">${escapeHtml(result.type.name)}</td><td>${result.count}</td><td>${result.Nw} × ${result.Nh}</td><td>${formatNumber(result.fps, 0)}</td><td>${U(formatNumber(result.bitrateMbps, 1), "mbps")}</td><td>${U(formatNumber(result.bitrateMbps * result.count, 0), "mbps")}</td></tr>`,
      )
      .join("") +
    `<tr class="total"><td class="txt">${t("nTotal")}</td><td>${cameraCount}</td><td></td><td></td><td></td><td>${U(formatNumber(totalMbps, 0), "mbps")}</td></tr>` +
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
  ) => `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(gpu.name)}</b><span class="sub">${gpu.jetson ? t("gJet") : escapeHtml(gpu.arch)}${gpu.custom ? " · " + t("gOwn") : ""}</span></td><td>${formatNumber(gpu.tflops, 1)}</td><td>${decText(gpu)}</td><td>${U(formatNumber(gpu.memoryGB, 0), "gb")}</td><td>${gpu.tdpW ? U(formatNumber(gpu.tdpW, 0), "w") : "—"}</td>
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
          `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(camera.name)}</b><span class="sub">${t(camera.custom ? "cOwn" : "cBuiltin")}</span></td><td>${camera.Nw} × ${camera.Nh}</td><td>${U(formatNumber(camera.sensorWidth, 2), "mm")}</td><td>${camera.focalMin > 0 ? (camera.focalMin === camera.focalMax ? U(formatNumber(camera.focalMin, 1), "mm") : U(formatNumber(camera.focalMin, 1) + "–" + formatNumber(camera.focalMax, 1), "mm")) : t("cAny")}</td><td>${camera.price > 0 ? "$" + formatNumber(camera.price, 0) : "—"}</td><td>${used(camera.id)}</td><td>${camera.custom ? `<button type="button" class="sm" data-delc="${camera.id}" aria-label="${escapeHtml(t("delAria", camera.name))}">${t("del")}</button>` : ""}</td></tr>`,
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
  const Rs = cameraTypes.map(computeType);
  const i = Math.max(
    0,
    cameraTypes.findIndex((t) => t.id === activeTypeId),
  );
  syncFormUI(cameraTypes[i], Rs[i]);
  renderType(Rs[i]);
  renderTabs(Rs);
  const system = computeSystem(Rs);
  const systemTotals = renderSystem(Rs, system);
  const chosen = system.chosen;
  report = [
    t("appTitle"),
    ...Rs.flatMap((r) =>
      r.err
        ? ["\n" + t("rErr", r.type.name, r.count)]
        : [
            `\n${r.type.name} × ${r.count}`,
            t("rCam", {
              rl: r.cameraLabel,
              rot: r.rotated,
              s: formatNumber(r.s, 2),
              f: formatNumber(r.f, 1),
              hf: formatNumber(r.hfov / DEG, 0),
              tilt: formatNumber(r.tilt / DEG, 0),
              top: r.placement === "top",
              L0: formatNumber(r.zoneStart, 2),
              H: formatNumber(r.H, 2),
              Wz: formatNumber(r.zoneWidth, 2),
              Dz: formatNumber(r.zoneDepth, 2),
            }),
            ...r.valid.map((o) =>
              t("rObj", {
                name: o.name,
                model: modelName(o),
                feed: o.feedInfo.text,
                pxs: r.sensorPxText(o),
                pxm: r.modelPxText(o),
                req: formatNumber(o.requiredPx, 0),
                st: STATUS_TEXT[o.status],
              }),
            ),
            t(
              "rStream",
              formatNumber(r.bitrateMbps, 1),
              Math.ceil(r.shutterDenominator),
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
const snap = () => ({
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
addEventListener("storage", (e) => {
  if (e.key === "camcalc4") {
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
    localStorage.setItem("camcalc4", JSON.stringify(snap()));
  } catch (e) {}
}
function load() {
  try {
    const st = JSON.parse(localStorage.getItem("camcalc4") || "null");
    if (!st) return;
    // старые сохранения: числа с десятичной запятой → нейтральный вид 1.5
    const dot = (x) => (typeof x === "string" ? x.replace(",", ".") : x);
    const dotAll = (obj) =>
      Object.fromEntries(Object.entries(obj).map(([k, x]) => [k, dot(x)]));
    const shownName = (x) => (x.nameKey && builtinName(x.nameKey)) || x.name;
    if (Array.isArray(st.customGpus))
      customGpus = st.customGpus
        .filter((g) => g && g.id && g.name && g.tflops > 0)
        .map((g) => ({ ...g, custom: true }));
    if (Array.isArray(st.customCameras))
      customCameras = st.customCameras
        .filter((c) => c && c.id && c.Nw > 0 && c.Nh > 0 && c.sensorWidth > 0)
        .map((c) => ({ ...c, custom: true }));
    if (Array.isArray(st.customDetectors))
      customDetectors = st.customDetectors
        .filter((d) => d && d.id && d.fps > 0)
        .map((d) => ({ ...d, custom: true }));
    if (st.gpuPrices && typeof st.gpuPrices === "object")
      gpuPrices = dotAll(st.gpuPrices);
    if (st.gpuEnabled && typeof st.gpuEnabled === "object")
      gpuEnabled = st.gpuEnabled;
    if (st.light) setTheme(true);
    buildGpuSelect();
    buildCameraSelect();
    if (Array.isArray(st.types) && st.types.length) {
      cameraTypes = st.types.map((t) => ({
        id: t.id || uid(),
        name: shownName(t),
        nameKey: t.nameKey,
        count: dot(t.count),
        inputs: dotAll({ ...DEFAULT_INPUTS, ...t.inputs }),
        objects: (t.objects || []).map((o) => ({
          ...makeObject([
            shownName(o),
            dot(o.width),
            dot(o.length),
            dot(o.height),
            dot(o.requiredPx),
            modelById(o.model) ? o.model : "y26s",
            o.feed,
            o.inputSize,
            o.nameKey,
          ]),
          overlap: dot(o.overlap ?? 20),
        })),
      }));
      activeTypeId = cameraTypes.some((t) => t.id === st.activeTypeId)
        ? st.activeTypeId
        : cameraTypes[0].id;
    }
    if (st.system)
      SYSTEM_IDS.forEach((id) => {
        const el = byId(id);
        if (st.system[id] != null) el.value = dot(st.system[id]);
        if (el.tagName === "SELECT" && el.selectedIndex < 0) el.value = "auto";
      });
  } catch (e) {}
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
  } catch (e) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
});
OBJECT_PRESETS.forEach((pr) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = pr[0];
  b.addEventListener("click", () => {
    activeType().objects.push(makeObject(pr));
    renderObjects();
    calcAll();
  });
  byId("presets").append(b);
});
byId("addObj").addEventListener("click", () => {
  const T = activeType();
  T.objects.push(
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
  const i = T.objects.length - 1;
  byId(`obj-name-${i}`).focus();
  byId(`obj-name-${i}`).select();
});
byId("frm").addEventListener("input", () => {
  readForm();
  calcAll();
});
byId("frm").addEventListener("change", () => {
  readForm();
  calcAll();
});
byId("frm").addEventListener("submit", (e) => e.preventDefault());
SYSTEM_IDS.forEach((id) => {
  byId(id).addEventListener("input", calcAll);
  byId(id).addEventListener("change", calcAll);
});
byId("dupBtn").addEventListener("click", () => {
  readForm();
  const src = activeType(),
    T = JSON.parse(JSON.stringify(src));
  T.id = uid();
  T.name = src.name + t("copySuffix");
  delete T.nameKey;
  cameraTypes.splice(cameraTypes.indexOf(src) + 1, 0, T);
  activeTypeId = T.id;
  writeForm(T);
  calcAll();
  toast(t("typeCopied"));
});
let delArm = null;
byId("delBtn").addEventListener("click", () => {
  const b = byId("delBtn");
  if (cameraTypes.length < 2) {
    toast(t("lastType"));
    return;
  }
  if (!delArm) {
    b.textContent = t("delConfirm");
    delArm = setTimeout(() => {
      b.textContent = t("delBtn");
      delArm = null;
    }, 3000);
    return;
  }
  clearTimeout(delArm);
  delArm = null;
  b.textContent = t("delBtn");
  const i = cameraTypes.findIndex((t) => t.id === activeTypeId);
  cameraTypes.splice(i, 1);
  activeTypeId = cameraTypes[Math.max(0, i - 1)].id;
  writeForm(activeType());
  calcAll();
  toast(t("typeDeleted"));
});
function toast(t) {
  const el = byId("toast");
  el.textContent = t;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 1800);
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
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([JSON.stringify(snap(), null, 1)], { type: "application/json" }),
  );
  a.download = "camera-calc.json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
});
function importText(s) {
  let st;
  try {
    st = JSON.parse(s);
  } catch (e) {}
  const isObj = (x) => x && typeof x === "object";
  if (
    !isObj(st) ||
    !Array.isArray(st.types) ||
    !st.types.length ||
    !st.types.every(
      (t) =>
        isObj(t) &&
        typeof t.name === "string" &&
        (t.objects == null ||
          (Array.isArray(t.objects) && t.objects.every(isObj))),
    ) ||
    !["customGpus", "customCameras", "customDetectors"].every((k) =>
      Array.isArray(st[k]),
    ) ||
    !isObj(st.gpuPrices) ||
    !isObj(st.gpuEnabled)
  ) {
    toast(t("badFile"));
    return;
  }
  try {
    localStorage.setItem("camcalc4", JSON.stringify(st));
  } catch (e) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
}
let impArm = null;
byId("impBtn").addEventListener("click", () => {
  const b = byId("impBtn");
  if (!impArm) {
    b.textContent = t("impConfirm");
    impArm = setTimeout(() => {
      b.textContent = t("impBtn");
      impArm = null;
    }, 3000);
    return;
  }
  clearTimeout(impArm);
  impArm = null;
  b.textContent = t("impBtn");
  byId("impFile").click();
});
byId("impFile").addEventListener("change", (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (f) f.text().then(importText, () => toast(t("readFail")));
});
const TPL = {
  "tpl-gpus": renderGpuView,
  "tpl-cams": renderCamView,
  "tpl-dets": renderDetView,
};
function route() {
  const h = location.hash.slice(1),
    isTpl = h in TPL;
  byId("viewMain").style.display = isTpl ? "none" : "flex";
  byId("viewTpl").hidden = !isTpl;
  byId("viewTpl").style.display = isTpl ? "flex" : "none";
  if (isTpl) {
    Object.keys(TPL).forEach((k) => {
      byId(k + "-v").hidden = k !== h;
      byId(k + "-v").style.display = k === h ? "flex" : "none";
      const a = byId("tt-" + k.slice(4));
      if (k === h) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    TPL[h]();
  } else if (h === "") (writeForm(activeType()), calcAll());
  try {
    window.scrollTo(0, 0);
  } catch (e) {}
}
window.addEventListener("hashchange", route);
