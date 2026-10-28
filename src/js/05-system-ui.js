// ---------- расчёт системы
const mName = (o) => (modelById(o.model) || { name: "?" }).name;
const gfOf = (id) => {
  const m = modelById(id);
  return m && m.gf > 0 ? m.gf : 0;
};
function computeSystem(Rs) {
  const live = Rs.filter((r) => !r.err && r.count > 0);
  const kr = P($("kr").value),
    resv = Math.max(0, P($("resv").value) || 0) / 100,
    uMax = 1 / (1 + resv),
    BATCH = 16;
  const groups = live.flatMap((r) =>
    r.groups.map((g) => ({ ...g, typeName: r.T.name })),
  );
  const engines = [
    ...new Map(groups.map((g) => [`${g.model}|${g.fi.inp}`, g])).values(),
  ];
  const modMemGB = (g) => {
    const gf = gfOf(g.model);
    return gf ? 0.15 + (BATCH * g.fi.inp ** 2 * 3 * 2 * (gf / 4)) / 1e9 : 0.5;
  };
  const evalGPU = (g, n) => {
    const mods = groups.map((o) => {
      let base;
      const m = modelById(o.model);
      if (!m) return { ...o, bad: true };
      if (MODELS.includes(m)) {
        const inScale = (640 / o.fi.inp) ** 2;
        base = ((1000 / m.ms) * inScale * g.tf) / T4TF;
      } else {
        const rg = gpuById(m.ref) || CATALOG[0],
          inScale = (m.inp / o.fi.inp) ** 2;
        base = (m.fps * inScale * g.tf) / rg.tf;
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
      memCap = g.mem * (g.jet ? 0.6 : 0.9);
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
    .sort((a, b) => a.cost - b.cost || a.n * a.g.tdp - b.n * b.g.tdp);
  const best = okAll[0],
    gSel = $("gpu").value,
    cSel = $("gcnt").value;
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
    const g = gpuById(gSel) || CATALOG[0];
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
function renderType(Rt) {
  const vd = $("verdict");
  $("resTitle").textContent = t("resTitleOf", Rt.T.name || t("untitled"));
  if (Rt.err) {
    vd.className = "verdict bad";
    vd.innerHTML = `<span class="pill">${t("pillErr")}</span><div>${t("errInput")}</div>`;
    ["kpis", "dens", "facts", "side"].forEach((id) => ($(id).innerHTML = ""));
    return;
  }
  vd.className = "verdict " + Rt.cls;
  vd.innerHTML = `<span class="pill">${Rt.pill}</span><div>${esc(Rt.head)}${Rt.notes.length ? "<ul>" + Rt.notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>" : ""}</div>`;
  const { hf, vf, f, rot, tilt, W, zOf, x1, x2 } = Rt;
  $("kpis").innerHTML = [
    [
      t("kF"),
      U(fmt(f, 1), "mm"),
      t(Rt.clamped ? "kFLimit" : Rt.m === "auto" ? "kFAuto" : "kFSet") +
        (rot ? t("kRot") : ""),
    ],
    [
      t(rot ? "kAngRot" : "kAng"),
      fmt(hf / R, 0) + "° × " + fmt(vf / R, 0) + "°",
      `DFOV ≈ ${fmt((2 * Math.atan(Math.hypot(Math.tan(hf / 2), Math.tan(vf / 2)))) / R, 0)}°`,
    ],
    [
      t("kTilt"),
      fmt(tilt / R, 0) + "°",
      t(Math.abs(tilt / R - 90) < 1 ? "kTiltDown" : "kTiltHor"),
    ],
    [
      t("kFrame"),
      U(fmt(W(zOf(x1)), 1) + "–" + fmt(W(zOf(x2)), 1), "m"),
      t("kFrameSub"),
    ],
  ]
    .map(
      ([l, v, e]) =>
        `<div class="kpi"><span>${l}</span><strong>${v}</strong><em>${e}</em></div>`,
    )
    .join("");
  Rt.objs.forEach((o, i) => {
    const el = $(`ores-${i}`),
      dt = $(`odot-${i}`);
    if (!el) return;
    if (o.bad) {
      el.className = "ores";
      el.textContent = t("objBad");
      if (dt) dt.className = "dot";
      return;
    }
    el.className = "ores " + o.st;
    if (dt) dt.className = "dot " + o.st;
    el.innerHTML = `<b>${cap1(stTxt[o.st])}</b><span>${t("objSeen", `<span class="mono">${Rt.pxm(o)}</span>`, fmt(o.reqN, 0))}</span><span class="m2">${t("objSensor", Rt.pxs(o), esc(o.fi.txt))}</span>`;
  });
  const top = Rt.pos === "top";
  $("dens").innerHTML =
    `<tr><th>${t("densHead")}</th><th>${t("across")}</th><th>${t("depth")}</th></tr>
    <tr><td class="txt">${t(top ? "edgeBack" : "edgeNear")}, ${U(fmt(Rt.P1.D, 1), "m")}</td><td>${fmt(Rt.P1.across, 0)}</td><td>${fmt(Rt.P1.depth, 0)}</td></tr>
    <tr><td class="txt">${t(top ? "edgeFwd" : "edgeFar")}, ${U(fmt(Rt.P2.D, 1), "m")}</td><td>${fmt(Rt.P2.across, 0)}</td><td>${fmt(Rt.P2.depth, 0)}</td></tr>`;
  const lv = [25, 62, 125, 250],
    names = STR.dori;
  let li = -1;
  lv.forEach((l, i) => {
    if (Rt.minA >= l) li = i;
  });
  const X = Rt.X;
  $("facts").innerHTML =
    `<span>DORI: <b>${li < 0 ? t("doriBelow") : names[li]}</b> (${U(fmt(Rt.minA, 0), "pxm")})</span><span>${t("exposure")} <b class="mono">${isFinite(X) && X > 0 ? U("1/" + Math.ceil(X), "s") : "—"}</b></span><span>${t("camera")}: <b>${esc(Rt.rl)}</b></span>`;
  drawSide({
    H: Rt.H,
    h: Rt.h,
    x1: Rt.x1,
    x2: Rt.x2,
    tilt: Rt.tilt,
    vf: Rt.vf,
    Hc: Rt.Hc,
    pos: Rt.pos,
    wN: W(zOf(x1)),
    wF: W(zOf(x2)),
  });
}

// ---------- вкладки
function renderTabs(Rs) {
  const nav = $("tabs");
  nav.innerHTML = "";
  Rs.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(r.T.id === ACT));
    b.setAttribute("aria-controls", "typeOut");
    b.innerHTML = `<span class="dot ${r.err ? "bad" : r.cls}" aria-hidden="true"></span><b>${esc(r.T.name || t("untitled"))}</b><small>× ${r.count}</small>`;
    b.title = r.err ? t("tabErr") : t("tabObjs", stTxt[r.cls] || r.pill);
    b.addEventListener("click", () => {
      if (ACT === r.T.id) return;
      ACT = r.T.id;
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
  const pc = (u) => fmt(u * 100, 0) + "%";
  const cams = Rs.reduce((s, r) => s + r.count, 0);
  const vAll = Rs.flatMap((r) => r.valid || []),
    objOk = vAll.filter((o) => o.st === "ok").length;
  const worstCls = Rs.some((r) => r.err || r.cls === "bad")
    ? "bad"
    : Rs.some((r) => r.cls === "warn")
      ? "warn"
      : "ok";
  const smallest = vAll.length
    ? vAll.reduce((a, b) => (a.mm < b.mm ? a : b))
    : null;
  const mbTot = live.reduce((s, r) => s + r.mb * r.count, 0);
  const camCost = Rs.reduce((s, r) => {
    const c = camById(r.T.v.cam);
    return s + (c && c.price > 0 ? c.price * r.count : 0);
  }, 0);
  const port =
    mbTot * 1.3 < 900
      ? U(1, "gbps")
      : mbTot * 1.3 < 9000
        ? U(10, "gbps")
        : "> " + U(10, "gbps");
  $("sysKpis").innerHTML = [
    [
      t("sCams"),
      `${cams}`,
      camCost
        ? t("sTypes", Rs.length) + t("sCamCost", "$" + fmt(camCost, 0))
        : t("sTypes", Rs.length, Rs.map((r) => r.T.name).join(", ")),
    ],
    [
      t("sObjs"),
      `<span class="dot ${worstCls}" aria-hidden="true"></span>${t("sOfN", objOk, vAll.length)}`,
      smallest
        ? t(
            "sSmallest",
            smallest.name,
            fmt(Math.min(smallest.bw, smallest.bh) * smallest.fi.msc, 1),
          )
        : t("sNoObjs"),
    ],
    [
      t("sCompute"),
      live.length ? `${E.n} × ${esc(E.g.name)}` : "—",
      live.length
        ? `$${fmt(E.cost, 0)} · ${E.ok ? t(E === best ? "optimum" : "manual") + " · " + t("headroom", pc(Math.max(0, 1 - E.worst))) : t("insufficient")}`
        : t("sNoCams"),
    ],
    [
      t("sNet"),
      `${U(fmt(mbTot, 0), "mbps")}`,
      t("sPort", port, fmt(cams * 15.4, 0)),
    ],
  ]
    .map(
      ([l, v, e]) =>
        `<div class="sk"><span>${l}</span><strong>${v}</strong><em>${esc(e)}</em></div>`,
    )
    .join("");
  // дашборд
  const hot = E.uI > uMax;
  $("dsum").innerHTML = live.length
    ? `<b>${E.n} × ${esc(E.g.name)}</b> · $${fmt(E.cost, 0)} · ${E.ok ? t(E === best ? "optimum" : "manual") : `<span style="color:var(--bad)">${t("insufficient")}</span>`}<br>${t("headroom", pc(Math.max(0, 1 - E.worst)))} · ${t("bottleneck", E.bott)}`
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
  $("donut").innerHTML = live.length
    ? ring(60, 60, 48, 14, segs, uMax) +
      `<text x="60" y="61" text-anchor="middle" class="big" style="fill:${hot ? "var(--bad)" : "var(--fg)"}">${pc(E.uI)}</text><text x="60" y="77" text-anchor="middle" class="cap">${t("donutCap")}</text>`
    : "";
  $("donut").setAttribute("aria-label", t("donutAriaVal", pc(E.uI), pc(uMax)));
  $("legend").innerHTML = live.length
    ? shown
        .map(
          (o, i) =>
            `<li><span class="sw" style="background:${COLS[i]}"></span><span>${esc(mName(o))} · ${FEED_SHORT[o.feed]} ${o.fi.inp}<span class="sub">${esc(o.typeName)}: ${esc(o.names.join(", "))} · ${U(fmt(o.load, 0), "fps")}</span></span><span class="pc">${pc(o.u)}</span></li>`,
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
  $("gauges").innerHTML = live.length
    ? gauge(
        t("gDec"),
        E.uD,
        uMax,
        pc(E.uD),
        t("gDecSub", fmt(S.decTotal, 1), fmt(decCapN, 0)),
      ) +
      gauge(
        t("gMem"),
        E.uM,
        1,
        pc(E.uM),
        t("gMemSub", fmt(E.memUse, 1), fmt(E.memCap, 0)),
      )
    : "";
  const warn = S.noCand ? t("noCand") : !best && live.length ? t("noFit") : "";
  $("loadNote").innerHTML = warn
    ? `<span style="color:var(--bad)">${esc(warn)}</span>`
    : live.length && STR.gpuNotes[E.g.id]
      ? esc(STR.gpuNotes[E.g.id])
      : "";
  $("loadNote").hidden = !$("loadNote").innerHTML;
  // сеть
  const days = P($("days").value) || 0,
    tb = (((mbTot * 1e6) / 8) * 86400 * days) / 1e12;
  $("netTbl").innerHTML =
    `<tr>${["nType", "nCams", "nRes", "nFps", "nPerCam", "nAll"].map((k) => `<th>${t(k)}</th>`).join("")}</tr>` +
    Rs.map((r) =>
      r.err
        ? `<tr><td class="txt">${esc(r.T.name)}</td><td>${r.count}</td><td colspan="4" class="dim" style="text-align:left">${t("tabErr")}</td></tr>`
        : `<tr><td class="txt">${esc(r.T.name)}</td><td>${r.count}</td><td>${r.Nw} × ${r.Nh}</td><td>${fmt(r.fps, 0)}</td><td>${U(fmt(r.mb, 1), "mbps")}</td><td>${U(fmt(r.mb * r.count, 0), "mbps")}</td></tr>`,
    ).join("") +
    `<tr class="total"><td class="txt">${t("nTotal")}</td><td>${cams}</td><td></td><td></td><td></td><td>${U(fmt(mbTot, 0), "mbps")}</td></tr>` +
    `<tr><td class="txt dim">${t("nArch")}</td><td colspan="5" class="dim">${days > 0 ? t("nArchVal", fmt(tb, 1), fmt(days, 0)) : t("nArchOff")}</td></tr>`;
  $("assList").innerHTML = t("ass", fmt(kr, 2))
    .map((x) => `<li>${esc(x)}</li>`)
    .join("");
  return { cams, mbTot, camCost };
}

// ---------- шаблоны: видеокарты
function buildGpuSelect() {
  const sel = $("gpu"),
    cur = sel.value || "auto";
  sel.innerHTML =
    `<option value="auto">${t("gpuAuto")}</option>` +
    allGpus()
      .map(
        (g) =>
          `<option value="${g.id}">${esc(g.name)}${g.custom ? t("gpuCustomMark") : ""}</option>`,
      )
      .join("");
  sel.value = allGpus().some((g) => g.id === cur) ? cur : "auto";
  const ref = $("ndRef");
  if (ref) {
    const c = ref.value;
    ref.innerHTML = allGpus()
      .map((g) => `<option value="${g.id}">${esc(g.name)}</option>`)
      .join("");
    ref.value = gpuById(c) ? c : "5090";
  }
}
function renderGpuView() {
  const row = (
    g,
  ) => `<tr><td class="txt"><b style="font-weight:600">${esc(g.name)}</b><span class="sub">${g.jet ? t("gJet") : esc(g.arch)}${g.custom ? " · " + t("gOwn") : ""}</span></td><td>${fmt(g.tf, 1)}</td><td>${decText(g)}</td><td>${U(fmt(g.mem, 0), "gb")}</td><td>${g.tdp ? U(fmt(g.tdp, 0), "w") : "—"}</td>
    <td><input id="pr-${g.id}" value="${esc(PRICE[g.id] ?? g.price)}" type="number" step="1" inputmode="numeric" aria-label="${esc(t("gPriceAria", g.name))}"></td>
    <td style="text-align:center"><input type="checkbox" id="gon-${g.id}" ${isOn(g) ? "checked" : ""} aria-label="${esc(t("gOnAria", g.name))}"></td>
    ${g.custom ? `<td><button type="button" class="sm" data-delg="${g.id}" aria-label="${esc(t("delAria", g.name))}">${t("del")}</button></td>` : "<td></td>"}</tr>`;
  const gh = STR.gHead,
    head = `<tr>${gh
      .slice(0, 6)
      .map((x) => `<th>${x}</th>`)
      .join("")}<th style="text-align:center">${gh[6]}</th><th></th></tr>`;
  $("catTitle").textContent = t("catTitle", CATALOG.length);
  $("catTbl").innerHTML = head + CATALOG.map(row).join("");
  $("mine").innerHTML = CUSTOM.length
    ? `<strong style="font-weight:600">${t("mineN", CUSTOM.length)}</strong><div class="tbl"><table>${head}${CUSTOM.map(row).join("")}</table></div>`
    : `<strong style="font-weight:600">${t("mine0")}</strong><span class="note" style="font-size:13px">${t("mineEmpty")}</span>`;
  allGpus().forEach((g) => {
    $(`pr-${g.id}`).addEventListener("input", (e) => {
      PRICE[g.id] = e.target.value;
      calcAll();
    });
    $(`gon-${g.id}`).addEventListener("change", (e) => {
      ON[g.id] = e.target.checked;
      calcAll();
    });
  });
  document.querySelectorAll("[data-delg]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.delg;
      CUSTOM = CUSTOM.filter((g) => g.id !== id);
      delete PRICE[id];
      delete ON[id];
      DETS.forEach((d) => {
        if (d.ref === id) d.ref = "5090";
      });
      buildGpuSelect();
      renderGpuView();
      calcAll();
      toast(t("gDeleted"));
    }),
  );
}
$("ngArch").addEventListener("change", () => {
  const j = $("ngArch").value === "jet";
  $("ngDecL").textContent = t(j ? "ngDecJet" : "ngDec");
  $("ngDec").placeholder = j ? "22" : "2";
});
$("newForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("ngName").value.trim(),
    arch = $("ngArch").value,
    tf = P($("ngTf").value),
    dec = P($("ngDec").value),
    mem = P($("ngMem").value),
    tdp = P($("ngTdp").value),
    price = P($("ngPrice").value);
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(tf > 0)) errs.push(t("eTf"));
  if (!(dec > 0)) errs.push(t(arch === "jet" ? "eDecJet" : "eDec"));
  if (!(mem > 0)) errs.push(t("eMem"));
  if (!(price > 0)) errs.push(t("ePrice"));
  const er = $("ngErr");
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
    tf,
    mem,
    tdp: tdp > 0 ? tdp : 0,
    price,
    custom: true,
  };
  if (arch === "jet") {
    g.jet = true;
    g.st = { h265: dec, h264: +((dec * 748) / 1415).toFixed(1) };
  } else g.nvdec = Math.round(dec);
  CUSTOM.push(g);
  ON[g.id] = $("ngOn").checked;
  ["ngName", "ngTf", "ngDec", "ngMem", "ngTdp", "ngPrice"].forEach(
    (id) => ($(id).value = ""),
  );
  buildGpuSelect();
  renderGpuView();
  calcAll();
  toast(t("gAdded", name));
});

// ---------- шаблоны: камеры
function renderCamView() {
  const used = (id) =>
    TYPES.filter((t) => t.v.cam === id).reduce(
      (s, t) => s + (Math.round(P(t.count)) || 0),
      0,
    );
  $("camTitle").textContent = t("camTitle", allCams().length);
  $("camTbl").innerHTML =
    `<tr>${STR.cHead.map((x) => `<th>${x}</th>`).join("")}<th></th></tr>` +
    allCams()
      .map(
        (c) =>
          `<tr><td class="txt"><b style="font-weight:600">${esc(c.name)}</b><span class="sub">${t(c.custom ? "cOwn" : "cBuiltin")}</span></td><td>${c.Nw} × ${c.Nh}</td><td>${U(fmt(c.sw, 2), "mm")}</td><td>${c.fmin > 0 ? (c.fmin === c.fmax ? U(fmt(c.fmin, 1), "mm") : U(fmt(c.fmin, 1) + "–" + fmt(c.fmax, 1), "mm")) : t("cAny")}</td><td>${c.price > 0 ? "$" + fmt(c.price, 0) : "—"}</td><td>${used(c.id)}</td><td>${c.custom ? `<button type="button" class="sm" data-delc="${c.id}" aria-label="${esc(t("delAria", c.name))}">${t("del")}</button>` : ""}</td></tr>`,
      )
      .join("");
  document.querySelectorAll("[data-delc]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.delc;
      CAMS_C = CAMS_C.filter((c) => c.id !== id);
      TYPES.forEach((t) => {
        if (t.v.cam === id) t.v.cam = "";
      });
      buildCamSelect();
      writeForm(act());
      renderCamView();
      calcAll();
      toast(t("cDeleted"));
    }),
  );
}
$("camForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("ncName").value.trim(),
    Nw = Math.round(P($("ncW").value)),
    Nh = Math.round(P($("ncH").value)),
    pp = P($("ncPp").value);
  let sw = P($("ncSw").value);
  let fmin = P($("ncFmin").value),
    fmax = P($("ncFmax").value);
  const price = P($("ncPrice").value);
  if (!(sw > 0) && pp > 0 && Nw > 0) sw = +((pp * Nw) / 1000).toFixed(3);
  if (fmin > 0 && !(fmax > 0)) fmax = fmin;
  if (fmax > 0 && !(fmin > 0)) fmin = fmax;
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(Nw > 0 && Nh > 0)) errs.push(t("eFrame"));
  if (!(sw > 0)) errs.push(t("eSw"));
  if (fmin > 0 && fmax > 0 && fmin > fmax) errs.push(t("eFRange"));
  const er = $("ncErr");
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
    sw,
    fmin: fmin > 0 ? fmin : 0,
    fmax: fmax > 0 ? fmax : 0,
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
  ].forEach((id) => ($(id).value = ""));
  buildCamSelect();
  renderCamView();
  save();
  toast(t("cAdded", name));
});

// ---------- шаблоны: детекторы
function renderDetView() {
  $("detTitle").textContent = t("detTitle", MODELS.length + DETS.length);
  const used = (id) =>
    TYPES.reduce((s, t) => s + t.objs.filter((o) => o.model === id).length, 0);
  $("detTbl").innerHTML =
    `<tr>${STR.dHead.map((x) => `<th>${x}</th>`).join("")}<th></th></tr>` +
    (DETS.length
      ? DETS.map((d) => {
          const rg = gpuById(d.ref);
          return `<tr><td class="txt"><b style="font-weight:600">${esc(d.name)}</b><span class="sub">${t("dOwn")}</span></td><td>${d.inp}</td><td>${d.gf > 0 ? fmt(d.gf, 1) : "—"}</td><td>${t("dSpeed", fmt(d.fps, 0), esc(rg ? rg.name : "?"))}</td><td>${used(d.id)}</td><td><button type="button" class="sm" data-deld="${d.id}" aria-label="${esc(t("delAria", d.name))}">${t("del")}</button></td></tr>`;
        }).join("")
      : `<tr><td class="txt dim" colspan="6">${t("dEmpty")}</td></tr>`) +
    MODELS.map(
      (m) =>
        `<tr><td class="txt">${m.name}<span class="sub">${t("dCatalog")}</span></td><td>640</td><td>${fmt(m.gf, 1)}</td><td>${t("dSpeed", fmt(1000 / m.ms, 0), "T4")}</td><td>${used(m.id)}</td><td></td></tr>`,
    ).join("");
  document.querySelectorAll("[data-deld]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.deld;
      DETS = DETS.filter((d) => d.id !== id);
      TYPES.forEach((t) =>
        t.objs.forEach((o) => {
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
$("ndInp").innerHTML = INPUTS.map(
  (x) => `<option${x === 640 ? " selected" : ""}>${x}</option>`,
).join("");
$("detForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("ndName").value.trim(),
    fps = P($("ndFps").value),
    inp = +$("ndInp").value,
    ref = $("ndRef").value,
    gf = P($("ndGf").value);
  const errs = [];
  if (!name) errs.push(t("eName"));
  if (!(fps > 0)) errs.push(t("eFps"));
  const er = $("ndErr");
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
    inp,
    ref,
    gf: gf > 0 ? gf : 0,
    custom: true,
  });
  ["ndName", "ndFps", "ndGf"].forEach((id) => ($(id).value = ""));
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
        ? ["\n" + t("rErr", r.T.name, r.count)]
        : [
            `\n${r.T.name} × ${r.count}`,
            t("rCam", {
              rl: r.rl,
              rot: r.rot,
              s: fmt(r.s, 2),
              f: fmt(r.f, 1),
              hf: fmt(r.hf / R, 0),
              tilt: fmt(r.tilt / R, 0),
              top: r.pos === "top",
              L0: fmt(r.L0, 2),
              H: fmt(r.H, 2),
              Wz: fmt(r.Wz, 2),
              Dz: fmt(r.Dz, 2),
            }),
            ...r.valid.map((o) =>
              t("rObj", {
                name: o.name,
                model: mName(o),
                feed: o.fi.txt,
                pxs: r.pxs(o),
                pxm: r.pxm(o),
                req: fmt(o.reqN, 0),
                st: stTxt[o.st],
              }),
            ),
            t("rStream", fmt(r.mb, 1), Math.ceil(r.X)),
          ],
    ),
    "\n" +
      t(
        "rSys",
        sysTot.cams,
        fmt(sysTot.mbTot, 0),
        sysTot.camCost ? "$" + fmt(sysTot.camCost, 0) : "",
      ),
    S.live.length
      ? t("rCompute", {
          n: E.n,
          g: E.g.name,
          cost: "$" + fmt(E.cost, 0),
          uI: fmt(E.uI * 100, 0),
          uD: fmt(E.uD * 100, 0),
          mem: fmt(E.memUse, 1),
          cap: fmt(E.memCap, 0),
          best:
            S.best && S.best !== E
              ? `${S.best.n} × ${S.best.g.name}, $${fmt(S.best.cost, 0)}`
              : "",
        })
      : t("rNoCompute"),
  ].join("\n");
  save();
}
const GL_IDS = ["kr", "resv", "days", "gpu", "gcnt"];
const snap = () => ({
  types: TYPES,
  act: ACT,
  gl: Object.fromEntries(GL_IDS.map((id) => [id, $(id).value])),
  price: PRICE,
  on: ON,
  custom: CUSTOM,
  cams: CAMS_C,
  dets: DETS,
  light: document.documentElement.classList.contains("light"),
});
let stale = false;
const STALE_MSG = t("stale");
addEventListener("storage", (e) => {
  if (e.key === "camcalc3") {
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
    localStorage.setItem("camcalc3", JSON.stringify(snap()));
  } catch (e) {}
}
function load() {
  try {
    const st = JSON.parse(localStorage.getItem("camcalc3") || "null");
    if (!st) return;
    // старые сохранения: числа с десятичной запятой → нейтральный вид 1.5
    const dot = (x) => (typeof x === "string" ? x.replace(",", ".") : x);
    const dotAll = (obj) =>
      Object.fromEntries(Object.entries(obj).map(([k, x]) => [k, dot(x)]));
    const shownName = (x) => (x.nameKey && builtinName(x.nameKey)) || x.name;
    if (Array.isArray(st.custom))
      CUSTOM = st.custom
        .filter((g) => g && g.id && g.name && g.tf > 0)
        .map((g) => ({ ...g, custom: true }));
    if (Array.isArray(st.cams))
      CAMS_C = st.cams
        .filter((c) => c && c.id && c.Nw > 0 && c.Nh > 0 && c.sw > 0)
        .map((c) => ({ ...c, custom: true }));
    if (Array.isArray(st.dets))
      DETS = st.dets
        .filter((d) => d && d.id && d.fps > 0)
        .map((d) => ({ ...d, custom: true }));
    if (st.price && typeof st.price === "object") PRICE = dotAll(st.price);
    if (st.on && typeof st.on === "object") ON = st.on;
    if (st.light) setTheme(true);
    buildGpuSelect();
    buildCamSelect();
    if (Array.isArray(st.types) && st.types.length) {
      TYPES = st.types.map((t) => ({
        id: t.id || uid(),
        name: shownName(t),
        nameKey: t.nameKey,
        count: dot(t.count),
        v: dotAll({ ...DEF_V, ...t.v }),
        objs: (t.objs || []).map((o) => ({
          ...mkObj([
            shownName(o),
            dot(o.w),
            dot(o.d),
            dot(o.z),
            dot(o.req),
            modelById(o.model) ? o.model : "y26s",
            o.feed,
            o.inp,
            o.nameKey,
          ]),
          ov: dot(o.ov ?? 20),
        })),
      }));
      ACT = TYPES.some((t) => t.id === st.act) ? st.act : TYPES[0].id;
    }
    if (st.gl)
      GL_IDS.forEach((id) => {
        const el = $(id);
        if (st.gl[id] != null) el.value = dot(st.gl[id]);
        if (el.tagName === "SELECT" && el.selectedIndex < 0) el.value = "auto";
      });
  } catch (e) {}
}

// ---------- события
function setTheme(light) {
  document.documentElement.classList.toggle("light", light);
  $("themeBtn").textContent = t(light ? "themeDark" : "themeLight");
  $("themeBtn").setAttribute("aria-pressed", String(light));
}
$("themeBtn").addEventListener("click", () => {
  setTheme(!document.documentElement.classList.contains("light"));
  save();
});
$("langBtn").lang = LANG === "en" ? "ru" : "en";
$("langBtn").addEventListener("click", () => {
  try {
    localStorage.setItem(LANG_KEY, $("langBtn").lang);
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
    act().objs.push(mkObj(pr));
    renderObjs();
    calcAll();
  });
  $("presets").append(b);
});
$("addObj").addEventListener("click", () => {
  const T = act();
  T.objs.push(
    mkObj([t("objDefault"), 10, 10, 10, 20, "y26s", "roi", 640, "objDefault"]),
  );
  renderObjs();
  calcAll();
  const i = T.objs.length - 1;
  $(`on-${i}`).focus();
  $(`on-${i}`).select();
});
$("frm").addEventListener("input", () => {
  readForm();
  calcAll();
});
$("frm").addEventListener("change", () => {
  readForm();
  calcAll();
});
$("frm").addEventListener("submit", (e) => e.preventDefault());
GL_IDS.forEach((id) => {
  $(id).addEventListener("input", calcAll);
  $(id).addEventListener("change", calcAll);
});
$("dupBtn").addEventListener("click", () => {
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
$("delBtn").addEventListener("click", () => {
  const b = $("delBtn");
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
  const el = $("toast");
  el.textContent = t;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (el.hidden = true), 1800);
}
$("resetBtn").addEventListener("click", () => {
  TYPES = defTypes();
  ACT = TYPES[0].id;
  $("kr").value = "0.6";
  $("resv").value = "20";
  $("days").value = "0";
  $("gcnt").value = "auto";
  PRICE = {};
  ON = {};
  buildGpuSelect();
  $("gpu").value = "auto";
  writeForm(act());
  calcAll();
  toast(t("exampleLoaded"));
});
$("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(report).then(
    () => toast(t("reportCopied")),
    () => toast(t("copyFail")),
  );
});
$("expBtn").addEventListener("click", () => {
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
        (t.objs == null || (Array.isArray(t.objs) && t.objs.every(isObj))),
    ) ||
    !["custom", "cams", "dets"].every((k) => Array.isArray(st[k])) ||
    !isObj(st.price) ||
    !isObj(st.on)
  ) {
    toast(t("badFile"));
    return;
  }
  try {
    localStorage.setItem("camcalc3", JSON.stringify(st));
  } catch (e) {
    toast(t("saveFail"));
    return;
  }
  location.reload();
}
let impArm = null;
$("impBtn").addEventListener("click", () => {
  const b = $("impBtn");
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
  $("impFile").click();
});
$("impFile").addEventListener("change", (e) => {
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
  $("viewMain").style.display = isTpl ? "none" : "flex";
  $("viewTpl").hidden = !isTpl;
  $("viewTpl").style.display = isTpl ? "flex" : "none";
  if (isTpl) {
    Object.keys(TPL).forEach((k) => {
      $(k + "-v").hidden = k !== h;
      $(k + "-v").style.display = k === h ? "flex" : "none";
      const a = $("tt-" + k.slice(4));
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
