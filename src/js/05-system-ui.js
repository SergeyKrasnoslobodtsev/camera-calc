// ---------- расчёт системы
const mName = (o) => (modelById(o.model) || { name: "?" }).name;
const gfOf = (id) => {
  const m = modelById(id);
  return m && m.gflops > 0 ? m.gflops : 0;
};
function computeSystem(Rs) {
  const live = Rs.filter((r) => !r.err && r.count > 0);
  const kr = parseNum(byId("efficiency").value),
    resv = Math.max(0, parseNum(byId("reserve").value) || 0) / 100,
    uMax = 1 / (1 + resv),
    BATCH = 16;
  const groups = live.flatMap((r) =>
    r.groups.map((g) => ({ ...g, typeName: r.type.name })),
  );
  const engines = [
    ...new Map(
      groups.map((g) => [`${g.model}|${g.feedInfo.inputSize}`, g]),
    ).values(),
  ];
  const modMemGB = (g) => {
    const gf = gfOf(g.model);
    return gf
      ? 0.15 + (BATCH * g.feedInfo.inputSize ** 2 * 3 * 2 * (gf / 4)) / 1e9
      : 0.5;
  };
  const evalGPU = (g, n) => {
    const mods = groups.map((o) => {
      let base;
      const m = modelById(o.model);
      if (!m) return { ...o, bad: true };
      if (MODELS.includes(m)) {
        const inScale = (640 / o.feedInfo.inputSize) ** 2;
        base = ((1000 / m.latencyMs) * inScale * g.tflops) / T4_TFLOPS;
      } else {
        const rg = gpuById(m.refGpu) || GPU_CATALOG[0],
          inScale = (m.inputSize / o.feedInfo.inputSize) ** 2;
        base = (m.fps * inScale * g.tflops) / rg.tflops;
      }
      const cap = base * kr;
      return { ...o, cap, gpu: o.load / cap };
    });
    const inf = mods.filter((o) => !o.bad).reduce((s, o) => s + o.gpu, 0);
    const dec = live.reduce(
      (s, r) => s + r.decUnits / (decStreams(g, r.codec) * kr),
      0,
    );
    const memUse =
        0.8 +
        engines.reduce((s, e) => s + modMemGB(e), 0) +
        live.reduce((s, r) => s + Math.ceil(r.count / n) * 20 * r.frameGB, 0),
      memCap = g.memoryGB * (g.jetson ? 0.6 : 0.9);
    const uI = inf / n,
      uD = dec / n,
      uM = memUse / memCap,
      worst = Math.max(uI, uD, uM);
    return {
      g,
      n,
      mods,
      inf,
      dec,
      uI,
      uD,
      uM,
      memUse,
      memCap,
      worst,
      ok: uI <= uMax && uD <= uMax && uM <= 1,
      cost: n * priceOf(g),
      bott: t(
        uI >= uD && uI >= uM ? "bottInf" : uD >= uM ? "bottDec" : "bottMem",
      ),
    };
  };
  const cand = allGpus().filter(isOn),
    all = [];
  cand.forEach((g) => {
    for (let n = 1; n <= 4; n++) all.push(evalGPU(g, n));
  });
  const okAll = all
    .filter((e) => e.ok)
    .sort((a, b) => a.cost - b.cost || a.n * a.g.tdpW - b.n * b.g.tdpW);
  const best = okAll[0],
    gSel = byId("gpu").value,
    cSel = byId("gpuCount").value;
  const minWorst = (arr) =>
    arr.length
      ? arr.reduce((a, b) => (a.worst < b.worst ? a : b))
      : evalGPU(allGpus()[0], 1);
  let E;
  if (gSel === "auto" && cSel === "auto") E = best || minWorst(all);
  else if (gSel === "auto") {
    const n = +cSel;
    E = okAll.find((e) => e.n === n) || minWorst(all.filter((e) => e.n === n));
  } else {
    const g = gpuById(gSel) || GPU_CATALOG[0];
    if (cSel === "auto") {
      E = null;
      for (let n = 1; n <= 4 && !E; n++) {
        const e = evalGPU(g, n);
        if (e.ok) E = e;
      }
      E = E || evalGPU(g, 4);
    } else E = evalGPU(g, +cSel);
  }
  const decTotal = live.reduce((s, r) => s + r.decUnits, 0);
  return {
    live,
    kr,
    uMax,
    resv,
    E,
    best,
    engines,
    decTotal,
    groups,
    noCand: !cand.length,
  };
}

// ---------- отрисовка типа
const stTxt = STR.st;
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function renderType(result) {
  const vd = byId("verdict");
  byId("resTitle").textContent = t(
    "resTitleOf",
    result.type.name || t("untitled"),
  );
  if (result.err) {
    vd.className = "verdict bad";
    vd.innerHTML = `<span class="pill">${t("pillErr")}</span><div>${t("errInput")}</div>`;
    ["kpis", "dens", "facts", "side"].forEach(
      (id) => (byId(id).innerHTML = ""),
    );
    return;
  }
  vd.className = "verdict " + result.status;
  vd.innerHTML = `<span class="pill">${result.pill}</span><div>${escapeHtml(result.headline)}${result.notes.length ? "<ul>" + result.notes.map((n) => "<li>" + escapeHtml(n) + "</li>").join("") + "</ul>" : ""}</div>`;
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
      ([l, v, e]) =>
        `<div class="kpi"><span>${l}</span><strong>${v}</strong><em>${e}</em></div>`,
    )
    .join("");
  result.objs.forEach((o, i) => {
    const el = byId(`ores-${i}`),
      dt = byId(`odot-${i}`);
    if (!el) return;
    if (o.bad) {
      el.className = "ores";
      el.textContent = t("objBad");
      if (dt) dt.className = "dot";
      return;
    }
    el.className = "ores " + o.status;
    if (dt) dt.className = "dot " + o.status;
    el.innerHTML = `<b>${cap1(stTxt[o.status])}</b><span>${t("objSeen", `<span class="mono">${result.modelPxText(o)}</span>`, formatNumber(o.requiredPx, 0))}</span><span class="m2">${t("objSensor", result.sensorPxText(o), escapeHtml(o.feedInfo.text))}</span>`;
  });
  const top = result.placement === "top";
  byId("dens").innerHTML =
    `<tr><th>${t("densHead")}</th><th>${t("across")}</th><th>${t("depth")}</th></tr>
    <tr><td class="txt">${t(top ? "edgeBack" : "edgeNear")}, ${U(formatNumber(result.edge1.D, 1), "m")}</td><td>${formatNumber(result.edge1.across, 0)}</td><td>${formatNumber(result.edge1.depth, 0)}</td></tr>
    <tr><td class="txt">${t(top ? "edgeFwd" : "edgeFar")}, ${U(formatNumber(result.edge2.D, 1), "m")}</td><td>${formatNumber(result.edge2.across, 0)}</td><td>${formatNumber(result.edge2.depth, 0)}</td></tr>`;
  const lv = [25, 62, 125, 250],
    names = STR.dori;
  let li = -1;
  lv.forEach((l, i) => {
    if (result.minAcross >= l) li = i;
  });
  const shutter = result.shutterDenominator;
  byId("facts").innerHTML =
    `<span>DORI: <b>${li < 0 ? t("doriBelow") : names[li]}</b> (${U(formatNumber(result.minAcross, 0), "pxm")})</span><span>${t("exposure")} <b class="mono">${isFinite(shutter) && shutter > 0 ? U("1/" + Math.ceil(shutter), "s") : "—"}</b></span><span>${t("camera")}: <b>${escapeHtml(result.cameraLabel)}</b></span>`;
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
function renderTabs(Rs) {
  const nav = byId("tabs");
  nav.innerHTML = "";
  Rs.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(r.type.id === ACT));
    b.setAttribute("aria-controls", "typeOut");
    b.innerHTML = `<span class="dot ${r.err ? "bad" : r.status}" aria-hidden="true"></span><b>${escapeHtml(r.type.name || t("untitled"))}</b><small>× ${r.count}</small>`;
    b.title = r.err ? t("tabErr") : t("tabObjs", stTxt[r.status] || r.pill);
    b.addEventListener("click", () => {
      if (ACT === r.type.id) return;
      ACT = r.type.id;
      writeForm(act());
      calcAll();
    });
    nav.append(b);
  });
  const add = document.createElement("button");
  add.type = "button";
  add.className = "tab ghost";
  add.textContent = t("addType");
  add.addEventListener("click", () => {
    const T = mkType(t("newType", TYPES.length + 1), 1, {}, [PRESETS[0]]);
    TYPES.push(T);
    ACT = T.id;
    writeForm(T);
    calcAll();
  });
  nav.append(add);
}

// ---------- кольца
function ring(cx, cy, r, w, segs, mark) {
  const C = 2 * Math.PI * r;
  let off = 0,
    s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${w}"/>`;
  segs.forEach((sg) => {
    const full = Math.max(0, Math.min(1 - off / C, sg.f)) * C;
    if (full <= 0) return;
    const len = segs.length > 1 && full > 2 ? full - 1 : full;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${w}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
    off += full;
  });
  if (mark != null) {
    const a = -Math.PI / 2 + 2 * Math.PI * mark,
      r1 = r - w / 2 - 2,
      r2 = r + w / 2 + 2;
    s += `<line x1="${(cx + r1 * Math.cos(a)).toFixed(2)}" y1="${(cy + r1 * Math.sin(a)).toFixed(2)}" x2="${(cx + r2 * Math.cos(a)).toFixed(2)}" y2="${(cy + r2 * Math.sin(a)).toFixed(2)}" stroke="var(--fg2)" stroke-width="1.5"/>`;
  }
  return s;
}

// ---------- система
function renderSystem(Rs, S) {
  const { E, best, kr, uMax, live } = S;
  const pc = (u) => formatNumber(u * 100, 0) + "%";
  const cams = Rs.reduce((s, r) => s + r.count, 0);
  const vAll = Rs.flatMap((r) => r.valid || []),
    objOk = vAll.filter((o) => o.status === "ok").length;
  const worstCls = Rs.some((r) => r.err || r.status === "bad")
    ? "bad"
    : Rs.some((r) => r.status === "warn")
      ? "warn"
      : "ok";
  const smallest = vAll.length
    ? vAll.reduce((a, b) => (a.modelPx < b.modelPx ? a : b))
    : null;
  const mbTot = live.reduce((s, r) => s + r.bitrateMbps * r.count, 0);
  const camCost = Rs.reduce((s, r) => {
    const c = camById(r.type.inputs.camera);
    return s + (c && c.price > 0 ? c.price * r.count : 0);
  }, 0);
  const port =
    mbTot * 1.3 < 900
      ? U(1, "gbps")
      : mbTot * 1.3 < 9000
        ? U(10, "gbps")
        : "> " + U(10, "gbps");
  byId("sysKpis").innerHTML = [
    [
      t("sCams"),
      `${cams}`,
      camCost
        ? t("sTypes", Rs.length) + t("sCamCost", "$" + formatNumber(camCost, 0))
        : t("sTypes", Rs.length, Rs.map((r) => r.type.name).join(", ")),
    ],
    [
      t("sObjs"),
      `<span class="dot ${worstCls}" aria-hidden="true"></span>${t("sOfN", objOk, vAll.length)}`,
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
      live.length ? `${E.n} × ${escapeHtml(E.g.name)}` : "—",
      live.length
        ? `$${formatNumber(E.cost, 0)} · ${E.ok ? t(E === best ? "optimum" : "manual") + " · " + t("headroom", pc(Math.max(0, 1 - E.worst))) : t("insufficient")}`
        : t("sNoCams"),
    ],
    [
      t("sNet"),
      `${U(formatNumber(mbTot, 0), "mbps")}`,
      t("sPort", port, formatNumber(cams * 15.4, 0)),
    ],
  ]
    .map(
      ([l, v, e]) =>
        `<div class="sk"><span>${l}</span><strong>${v}</strong><em>${escapeHtml(e)}</em></div>`,
    )
    .join("");
  // дашборд
  const hot = E.uI > uMax;
  byId("dsum").innerHTML = live.length
    ? `<b>${E.n} × ${escapeHtml(E.g.name)}</b> · $${formatNumber(E.cost, 0)} · ${E.ok ? t(E === best ? "optimum" : "manual") : `<span style="color:var(--bad)">${t("insufficient")}</span>`}<br>${t("headroom", pc(Math.max(0, 1 - E.worst)))} · ${t("bottleneck", E.bott)}`
    : "";
  const runs = E.mods
    .filter((o) => !o.bad)
    .map((o) => ({ ...o, u: o.gpu / E.n }))
    .sort((a, b) => b.u - a.u);
  const COLS = [
    "var(--c1)",
    "var(--c2)",
    "var(--c3)",
    "var(--c4)",
    "var(--c5)",
  ];
  const shown = runs.slice(0, 5),
    rest = runs.slice(5),
    restU = rest.reduce((s, o) => s + o.u, 0);
  const segs = shown.map((o, i) => ({ f: o.u, color: COLS[i] }));
  if (restU > 0) segs.push({ f: restU, color: "var(--c6)" });
  byId("donut").innerHTML = live.length
    ? ring(60, 60, 48, 14, segs, uMax) +
      `<text x="60" y="61" text-anchor="middle" class="big" style="fill:${hot ? "var(--bad)" : "var(--fg)"}">${pc(E.uI)}</text><text x="60" y="77" text-anchor="middle" class="cap">${t("donutCap")}</text>`
    : "";
  byId("donut").setAttribute(
    "aria-label",
    t("donutAriaVal", pc(E.uI), pc(uMax)),
  );
  byId("legend").innerHTML = live.length
    ? shown
        .map(
          (o, i) =>
            `<li><span class="sw" style="background:${COLS[i]}"></span><span>${escapeHtml(mName(o))} · ${FEED_SHORT[o.feed]} ${o.feedInfo.inputSize}<span class="sub">${escapeHtml(o.typeName)}: ${escapeHtml(o.names.join(", "))} · ${U(formatNumber(o.load, 0), "fps")}</span></span><span class="pc">${pc(o.u)}</span></li>`,
        )
        .join("") +
      (rest.length
        ? `<li><span class="sw" style="background:var(--c6)"></span><span>${t("otherRuns", rest.length)}</span><span class="pc">${pc(restU)}</span></li>`
        : "") +
      `<li><span class="sw" style="background:var(--track)"></span><span>${t("free")}<span class="sub">${t("freeSub", pc(uMax))}</span></span><span class="pc">${pc(Math.max(0, 1 - E.uI))}</span></li>`
    : `<li class="note">${t("noLoad")}</li>`;
  const decCapN = (E.n * S.decTotal) / (E.dec || 1);
  const gauge = (label, u, lim, center, sub) =>
    `<div class="gauge"><svg viewBox="0 0 84 84" role="img" aria-label="${label}: ${center}">${ring(42, 42, 32, 9, [{ f: u, color: u > lim ? "var(--bad)" : "var(--meter)" }], lim < 1 ? lim : null)}<text x="42" y="48" text-anchor="middle" class="mid" style="font-size:17px">${center}</text></svg><span><b>${label}</b>${sub}</span></div>`;
  byId("gauges").innerHTML = live.length
    ? gauge(
        t("gDec"),
        E.uD,
        uMax,
        pc(E.uD),
        t("gDecSub", formatNumber(S.decTotal, 1), formatNumber(decCapN, 0)),
      ) +
      gauge(
        t("gMem"),
        E.uM,
        1,
        pc(E.uM),
        t("gMemSub", formatNumber(E.memUse, 1), formatNumber(E.memCap, 0)),
      )
    : "";
  const warn = S.noCand ? t("noCand") : !best && live.length ? t("noFit") : "";
  byId("loadNote").innerHTML = warn
    ? `<span style="color:var(--bad)">${escapeHtml(warn)}</span>`
    : live.length && STR.gpuNotes[E.g.id]
      ? escapeHtml(STR.gpuNotes[E.g.id])
      : "";
  byId("loadNote").hidden = !byId("loadNote").innerHTML;
  // сеть
  const days = parseNum(byId("archiveDays").value) || 0,
    tb = (((mbTot * 1e6) / 8) * 86400 * days) / 1e12;
  byId("netTbl").innerHTML =
    `<tr>${["nType", "nCams", "nRes", "nFps", "nPerCam", "nAll"].map((k) => `<th>${t(k)}</th>`).join("")}</tr>` +
    Rs.map((r) =>
      r.err
        ? `<tr><td class="txt">${escapeHtml(r.type.name)}</td><td>${r.count}</td><td colspan="4" class="dim" style="text-align:left">${t("tabErr")}</td></tr>`
        : `<tr><td class="txt">${escapeHtml(r.type.name)}</td><td>${r.count}</td><td>${r.Nw} × ${r.Nh}</td><td>${formatNumber(r.fps, 0)}</td><td>${U(formatNumber(r.bitrateMbps, 1), "mbps")}</td><td>${U(formatNumber(r.bitrateMbps * r.count, 0), "mbps")}</td></tr>`,
    ).join("") +
    `<tr class="total"><td class="txt">${t("nTotal")}</td><td>${cams}</td><td></td><td></td><td></td><td>${U(formatNumber(mbTot, 0), "mbps")}</td></tr>` +
    `<tr><td class="txt dim">${t("nArch")}</td><td colspan="5" class="dim">${days > 0 ? t("nArchVal", formatNumber(tb, 1), formatNumber(days, 0)) : t("nArchOff")}</td></tr>`;
  byId("assList").innerHTML = t("ass", formatNumber(kr, 2))
    .map((x) => `<li>${escapeHtml(x)}</li>`)
    .join("");
  return { cams, mbTot, camCost };
}

// ---------- шаблоны: видеокарты
function buildGpuSelect() {
  const sel = byId("gpu"),
    cur = sel.value || "auto";
  sel.innerHTML =
    `<option value="auto">${t("gpuAuto")}</option>` +
    allGpus()
      .map(
        (g) =>
          `<option value="${g.id}">${escapeHtml(g.name)}${g.custom ? t("gpuCustomMark") : ""}</option>`,
      )
      .join("");
  sel.value = allGpus().some((g) => g.id === cur) ? cur : "auto";
  const ref = byId("ndRef");
  if (ref) {
    const c = ref.value;
    ref.innerHTML = allGpus()
      .map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`)
      .join("");
    ref.value = gpuById(c) ? c : "5090";
  }
}
function renderGpuView() {
  const row = (
    g,
  ) => `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(g.name)}</b><span class="sub">${g.jetson ? t("gJet") : escapeHtml(g.arch)}${g.custom ? " · " + t("gOwn") : ""}</span></td><td>${formatNumber(g.tflops, 1)}</td><td>${decText(g)}</td><td>${U(formatNumber(g.memoryGB, 0), "gb")}</td><td>${g.tdpW ? U(formatNumber(g.tdpW, 0), "w") : "—"}</td>
    <td><input id="pr-${g.id}" value="${escapeHtml(gpuPrices[g.id] ?? g.price)}" type="number" step="1" inputmode="numeric" aria-label="${escapeHtml(t("gPriceAria", g.name))}"></td>
    <td style="text-align:center"><input type="checkbox" id="gon-${g.id}" ${isOn(g) ? "checked" : ""} aria-label="${escapeHtml(t("gOnAria", g.name))}"></td>
    ${g.custom ? `<td><button type="button" class="sm" data-delg="${g.id}" aria-label="${escapeHtml(t("delAria", g.name))}">${t("del")}</button></td>` : "<td></td>"}</tr>`;
  const gh = STR.gHead,
    head = `<tr>${gh
      .slice(0, 6)
      .map((x) => `<th>${x}</th>`)
      .join("")}<th style="text-align:center">${gh[6]}</th><th></th></tr>`;
  byId("catTitle").textContent = t("catTitle", GPU_CATALOG.length);
  byId("catTbl").innerHTML = head + GPU_CATALOG.map(row).join("");
  byId("mine").innerHTML = customGpus.length
    ? `<strong style="font-weight:600">${t("mineN", customGpus.length)}</strong><div class="tbl"><table>${head}${customGpus.map(row).join("")}</table></div>`
    : `<strong style="font-weight:600">${t("mine0")}</strong><span class="note" style="font-size:13px">${t("mineEmpty")}</span>`;
  allGpus().forEach((g) => {
    byId(`pr-${g.id}`).addEventListener("input", (e) => {
      gpuPrices[g.id] = e.target.value;
      calcAll();
    });
    byId(`gon-${g.id}`).addEventListener("change", (e) => {
      gpuEnabled[g.id] = e.target.checked;
      calcAll();
    });
  });
  document.querySelectorAll("[data-delg]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.delg;
      customGpus = customGpus.filter((g) => g.id !== id);
      delete gpuPrices[id];
      delete gpuEnabled[id];
      DETS.forEach((d) => {
        if (d.refGpu === id) d.refGpu = "5090";
      });
      buildGpuSelect();
      renderGpuView();
      calcAll();
      toast(t("gDeleted"));
    }),
  );
}
byId("ngArch").addEventListener("change", () => {
  const j = byId("ngArch").value === "jet";
  byId("ngDecL").textContent = t(j ? "ngDecJet" : "ngDec");
  byId("ngDec").placeholder = j ? "22" : "2";
});
byId("newForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = byId("ngName").value.trim(),
    arch = byId("ngArch").value,
    tflops = parseNum(byId("ngTf").value),
    dec = parseNum(byId("ngDec").value),
    memoryGB = parseNum(byId("ngMem").value),
    tdpW = parseNum(byId("ngTdp").value),
    price = parseNum(byId("ngPrice").value);
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(tflops > 0)) errs.push(t("eTf"));
  if (!(dec > 0)) errs.push(t(arch === "jet" ? "eDecJet" : "eDec"));
  if (!(memoryGB > 0)) errs.push(t("eMem"));
  if (!(price > 0)) errs.push(t("ePrice"));
  const er = byId("ngErr");
  if (errs.length) {
    er.hidden = false;
    er.textContent = t("ngErr", errs.join(", "));
    return;
  }
  er.hidden = true;
  const g = {
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
    g.jetson = true;
    g.decodeStreams = { h265: dec, h264: +((dec * 748) / 1415).toFixed(1) };
  } else g.nvdec = Math.round(dec);
  customGpus.push(g);
  gpuEnabled[g.id] = byId("ngOn").checked;
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
    TYPES.filter((t) => t.inputs.camera === id).reduce(
      (s, t) => s + (Math.round(parseNum(t.count)) || 0),
      0,
    );
  byId("camTitle").textContent = t("camTitle", allCams().length);
  byId("camTbl").innerHTML =
    `<tr>${STR.cHead.map((x) => `<th>${x}</th>`).join("")}<th></th></tr>` +
    allCams()
      .map(
        (c) =>
          `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(c.name)}</b><span class="sub">${t(c.custom ? "cOwn" : "cBuiltin")}</span></td><td>${c.Nw} × ${c.Nh}</td><td>${U(formatNumber(c.sensorWidth, 2), "mm")}</td><td>${c.focalMin > 0 ? (c.focalMin === c.focalMax ? U(formatNumber(c.focalMin, 1), "mm") : U(formatNumber(c.focalMin, 1) + "–" + formatNumber(c.focalMax, 1), "mm")) : t("cAny")}</td><td>${c.price > 0 ? "$" + formatNumber(c.price, 0) : "—"}</td><td>${used(c.id)}</td><td>${c.custom ? `<button type="button" class="sm" data-delc="${c.id}" aria-label="${escapeHtml(t("delAria", c.name))}">${t("del")}</button>` : ""}</td></tr>`,
      )
      .join("");
  document.querySelectorAll("[data-delc]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.delc;
      CAMS_C = CAMS_C.filter((c) => c.id !== id);
      TYPES.forEach((t) => {
        if (t.inputs.camera === id) t.inputs.camera = "";
      });
      buildCamSelect();
      writeForm(act());
      renderCamView();
      calcAll();
      toast(t("cDeleted"));
    }),
  );
}
byId("camForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = byId("ncName").value.trim(),
    Nw = Math.round(parseNum(byId("ncW").value)),
    Nh = Math.round(parseNum(byId("ncH").value)),
    pp = parseNum(byId("ncPp").value);
  let sensorWidth = parseNum(byId("ncSw").value);
  let focalMin = parseNum(byId("ncFmin").value),
    focalMax = parseNum(byId("ncFmax").value);
  const price = parseNum(byId("ncPrice").value);
  if (!(sensorWidth > 0) && pp > 0 && Nw > 0)
    sensorWidth = +((pp * Nw) / 1000).toFixed(3);
  if (focalMin > 0 && !(focalMax > 0)) focalMax = focalMin;
  if (focalMax > 0 && !(focalMin > 0)) focalMin = focalMax;
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(Nw > 0 && Nh > 0)) errs.push(t("eFrame"));
  if (!(sensorWidth > 0)) errs.push(t("eSw"));
  if (focalMin > 0 && focalMax > 0 && focalMin > focalMax)
    errs.push(t("eFRange"));
  const er = byId("ncErr");
  if (errs.length) {
    er.hidden = false;
    er.textContent = t("ncErr", errs.join(", "));
    return;
  }
  er.hidden = true;
  CAMS_C.push({
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
  buildCamSelect();
  renderCamView();
  save();
  toast(t("cAdded", name));
});

// ---------- шаблоны: детекторы
function renderDetView() {
  byId("detTitle").textContent = t("detTitle", MODELS.length + DETS.length);
  const used = (id) =>
    TYPES.reduce(
      (s, t) => s + t.objects.filter((o) => o.model === id).length,
      0,
    );
  byId("detTbl").innerHTML =
    `<tr>${STR.dHead.map((x) => `<th>${x}</th>`).join("")}<th></th></tr>` +
    (DETS.length
      ? DETS.map((d) => {
          const rg = gpuById(d.refGpu);
          return `<tr><td class="txt"><b style="font-weight:600">${escapeHtml(d.name)}</b><span class="sub">${t("dOwn")}</span></td><td>${d.inputSize}</td><td>${d.gflops > 0 ? formatNumber(d.gflops, 1) : "—"}</td><td>${t("dSpeed", formatNumber(d.fps, 0), escapeHtml(rg ? rg.name : "?"))}</td><td>${used(d.id)}</td><td><button type="button" class="sm" data-deld="${d.id}" aria-label="${escapeHtml(t("delAria", d.name))}">${t("del")}</button></td></tr>`;
        }).join("")
      : `<tr><td class="txt dim" colspan="6">${t("dEmpty")}</td></tr>`) +
    MODELS.map(
      (m) =>
        `<tr><td class="txt">${m.name}<span class="sub">${t("dCatalog")}</span></td><td>640</td><td>${formatNumber(m.gflops, 1)}</td><td>${t("dSpeed", formatNumber(1000 / m.latencyMs, 0), "T4")}</td><td>${used(m.id)}</td><td></td></tr>`,
    ).join("");
  document.querySelectorAll("[data-deld]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.deld;
      DETS = DETS.filter((d) => d.id !== id);
      TYPES.forEach((t) =>
        t.objects.forEach((o) => {
          if (o.model === id) o.model = "y26s";
        }),
      );
      renderObjs();
      renderDetView();
      calcAll();
      toast(t("dDeleted"));
    }),
  );
}
byId("ndInp").innerHTML = INPUTS.map(
  (x) => `<option${x === 640 ? " selected" : ""}>${x}</option>`,
).join("");
byId("detForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = byId("ndName").value.trim(),
    fps = parseNum(byId("ndFps").value),
    inputSize = +byId("ndInp").value,
    refGpu = byId("ndRef").value,
    gflops = parseNum(byId("ndGf").value);
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(fps > 0)) errs.push(t("eFps"));
  const er = byId("ndErr");
  if (errs.length) {
    er.hidden = false;
    er.textContent = t("ncErr", errs.join(", "));
    return;
  }
  er.hidden = true;
  DETS.push({
    id: "d" + uid(),
    name,
    fps,
    inputSize,
    refGpu,
    gflops: gflops > 0 ? gflops : 0,
    custom: true,
  });
  ["ndName", "ndFps", "ndGf"].forEach((id) => (byId(id).value = ""));
  renderObjs();
  renderDetView();
  calcAll();
  toast(t("dAdded", name));
});

// ---------- главный цикл
let report = "";
function calcAll() {
  const Rs = TYPES.map(computeType);
  const i = Math.max(
    0,
    TYPES.findIndex((t) => t.id === ACT),
  );
  syncFormUI(TYPES[i], Rs[i]);
  renderType(Rs[i]);
  renderTabs(Rs);
  const S = computeSystem(Rs);
  const sysTot = renderSystem(Rs, S);
  const E = S.E;
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
                model: mName(o),
                feed: o.feedInfo.text,
                pxs: r.sensorPxText(o),
                pxm: r.modelPxText(o),
                req: formatNumber(o.requiredPx, 0),
                st: stTxt[o.status],
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
        sysTot.cams,
        formatNumber(sysTot.mbTot, 0),
        sysTot.camCost ? "$" + formatNumber(sysTot.camCost, 0) : "",
      ),
    S.live.length
      ? t("rCompute", {
          n: E.n,
          g: E.g.name,
          cost: "$" + formatNumber(E.cost, 0),
          uI: formatNumber(E.uI * 100, 0),
          uD: formatNumber(E.uD * 100, 0),
          mem: formatNumber(E.memUse, 1),
          cap: formatNumber(E.memCap, 0),
          best:
            S.best && S.best !== E
              ? `${S.best.n} × ${S.best.g.name}, $${formatNumber(S.best.cost, 0)}`
              : "",
        })
      : t("rNoCompute"),
  ].join("\n");
  save();
}
const SYSTEM_IDS = ["efficiency", "reserve", "archiveDays", "gpu", "gpuCount"];
const snap = () => ({
  types: TYPES,
  activeTypeId: ACT,
  system: Object.fromEntries(SYSTEM_IDS.map((id) => [id, byId(id).value])),
  gpuPrices,
  gpuEnabled,
  customGpus,
  customCameras: CAMS_C,
  customDetectors: DETS,
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
      CAMS_C = st.customCameras
        .filter((c) => c && c.id && c.Nw > 0 && c.Nh > 0 && c.sensorWidth > 0)
        .map((c) => ({ ...c, custom: true }));
    if (Array.isArray(st.customDetectors))
      DETS = st.customDetectors
        .filter((d) => d && d.id && d.fps > 0)
        .map((d) => ({ ...d, custom: true }));
    if (st.gpuPrices && typeof st.gpuPrices === "object")
      gpuPrices = dotAll(st.gpuPrices);
    if (st.gpuEnabled && typeof st.gpuEnabled === "object")
      gpuEnabled = st.gpuEnabled;
    if (st.light) setTheme(true);
    buildGpuSelect();
    buildCamSelect();
    if (Array.isArray(st.types) && st.types.length) {
      TYPES = st.types.map((t) => ({
        id: t.id || uid(),
        name: shownName(t),
        nameKey: t.nameKey,
        count: dot(t.count),
        inputs: dotAll({ ...DEF_V, ...t.inputs }),
        objects: (t.objects || []).map((o) => ({
          ...mkObj([
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
      ACT = TYPES.some((t) => t.id === st.activeTypeId)
        ? st.activeTypeId
        : TYPES[0].id;
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
PRESETS.forEach((pr) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = pr[0];
  b.addEventListener("click", () => {
    act().objects.push(mkObj(pr));
    renderObjs();
    calcAll();
  });
  byId("presets").append(b);
});
byId("addObj").addEventListener("click", () => {
  const T = act();
  T.objects.push(
    mkObj([t("objDefault"), 10, 10, 10, 20, "y26s", "roi", 640, "objDefault"]),
  );
  renderObjs();
  calcAll();
  const i = T.objects.length - 1;
  byId(`on-${i}`).focus();
  byId(`on-${i}`).select();
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
  const src = act(),
    T = JSON.parse(JSON.stringify(src));
  T.id = uid();
  T.name = src.name + t("copySuffix");
  delete T.nameKey;
  TYPES.splice(TYPES.indexOf(src) + 1, 0, T);
  ACT = T.id;
  writeForm(T);
  calcAll();
  toast(t("typeCopied"));
});
let delArm = null;
byId("delBtn").addEventListener("click", () => {
  const b = byId("delBtn");
  if (TYPES.length < 2) {
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
  const i = TYPES.findIndex((t) => t.id === ACT);
  TYPES.splice(i, 1);
  ACT = TYPES[Math.max(0, i - 1)].id;
  writeForm(act());
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
  TYPES = defTypes();
  ACT = TYPES[0].id;
  byId("efficiency").value = "0.6";
  byId("reserve").value = "20";
  byId("archiveDays").value = "0";
  byId("gpuCount").value = "auto";
  gpuPrices = {};
  gpuEnabled = {};
  buildGpuSelect();
  byId("gpu").value = "auto";
  writeForm(act());
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
  } else if (h === "") (writeForm(act()), calcAll());
  try {
    window.scrollTo(0, 0);
  } catch (e) {}
}
window.addEventListener("hashchange", route);
