// ---------- расчёт одного типа камер (без DOM)
function computeType(T) {
  const v = T.v,
    m = v.mode,
    pos = v.pos,
    count = Math.max(0, Math.round(P(T.count)) || 0);
  const cam = camById(v.cam);
  let [rl, Nw, Nh] = RES[+v.res] || RES[1];
  const sv = (SENS[+v.sens] || SENS[3])[1];
  let s =
    typeof sv === "number" ? sv : sv === "pp" ? (P(v.pp) * Nw) / 1000 : P(v.sw);
  if (cam) {
    rl = cam.name;
    Nw = cam.Nw;
    Nh = cam.Nh;
    s = cam.sw;
  }
  const H = P(v.H),
    h = P(v.h),
    L0 = P(v.L0),
    Dz = P(v.Dz),
    Wz = P(v.Wz),
    mg = (P(v.mg) || 0) / 100,
    k = P(v.k),
    vel = P(v.v),
    bl = P(v.blur);
  const fps = P(v.fps),
    bpp = +v.codec,
    sc = +v.scene,
    afps0 = P(v.afps),
    afps = Math.min(afps0, fps),
    codec = bpp < 0.055 ? "h265" : "h264";
  const Hc = H - h;
  const base = { T, count, rl, Nw, Nh, s, fps, afps, afps0, codec, bpp, sc };
  if (
    ![H, h, Dz, Wz, s, k].every(isFinite) ||
    (pos === "side" && !isFinite(L0)) ||
    Hc <= 0 ||
    Dz <= 0 ||
    Wz <= 0 ||
    !(s > 0)
  )
    return { ...base, err: true };
  const x1 = pos === "top" ? -Dz / 2 : L0,
    x2 = x1 + Dz;
  const phi1 = Math.atan2(Hc, x1),
    phi2 = Math.atan2(Hc, x2);
  const span = phi1 - phi2,
    tilt = (phi1 + phi2) / 2;
  const zOf = (x) => x * Math.cos(tilt) + Hc * Math.sin(tilt);
  const zMin = Math.min(zOf(x1), zOf(x2));
  const fitFor = (rot) => {
    const Nu = rot ? Nh : Nw,
      Nv = rot ? Nw : Nh,
      su = rot ? (s * Nh) / Nw : s,
      a = Nu / Nv;
    let hf,
      f,
      fWant = null;
    if (m === "auto") {
      const hReq = 2 * Math.atan((Wz * (1 + mg)) / 2 / zMin),
        vReq = span * (1 + mg);
      hf = Math.max(hReq, 2 * Math.atan(a * Math.tan(vReq / 2)));
      f = su / (2 * Math.tan(hf / 2));
      fWant = f;
      if (cam && cam.fmin > 0) {
        const fc = Math.min(cam.fmax, Math.max(cam.fmin, f));
        if (Math.abs(fc - f) > 1e-6) {
          f = fc;
          hf = 2 * Math.atan(su / (2 * f));
        }
      }
    } else if (m === "f") {
      f = P(v.fmm);
      hf = 2 * Math.atan(su / (2 * f));
    } else {
      hf = P(v.hfov) * R;
      f = su / (2 * Math.tan(hf / 2));
    }
    const vf = 2 * Math.atan(Math.tan(hf / 2) / a),
      fpx = Nu / (2 * Math.tan(hf / 2));
    return {
      rot,
      Nu,
      Nv,
      hf,
      f,
      fWant,
      vf,
      fpx,
      fits: 2 * zMin * Math.tan(hf / 2) >= Wz && vf >= span,
    };
  };
  let O;
  if (v.orient === "land") O = fitFor(false);
  else if (v.orient === "port") O = fitFor(true);
  else {
    const A = fitFor(false),
      B = fitFor(true);
    O =
      m === "auto" ? (B.fpx > A.fpx * 1.02 ? B : A) : A.fits || !B.fits ? A : B;
  }
  const { rot, hf, f, fWant, vf, fpx, Nu, Nv } = O;
  if (!isFinite(fpx) || fpx <= 0) return { ...base, err: true };
  const W = (z) => 2 * z * Math.tan(hf / 2);
  const at = (x) => {
    const phi = Math.atan2(Hc, x),
      D = Math.hypot(Hc, x),
      d = phi - tilt,
      z = D * Math.cos(d);
    return {
      x,
      D,
      z,
      phi,
      across: fpx / z,
      depth: (fpx * Math.sin(phi)) / (D * Math.cos(d) ** 2),
    };
  };
  const P1 = at(x1),
    P2 = at(x2),
    S = [];
  for (let i = 0; i <= 40; i++) S.push(at(x1 + ((x2 - x1) * i) / 40));
  const minA = Math.min(...S.map((p) => p.across)),
    minD = Math.min(...S.map((p) => p.depth)),
    maxR = Math.max(...S.map((p) => Math.max(p.across, p.depth)));
  // точная проекция коробки Ш×Д×В, стоящей на плоскости по центру кадра
  const ct = Math.cos(tilt),
    st = Math.sin(tilt);
  const proj = (X, Y, Z) => {
    const dz = Z - Hc,
      zc = X * ct - dz * st;
    if (zc <= 1e-6) return null;
    return [(fpx * Y) / zc, (fpx * (X * st + dz * ct)) / zc];
  };
  const boxPx = (x0, w, d, zh) => {
    const zt = Math.min(zh, Hc * 0.98);
    let u0 = 1e9,
      u1 = -1e9,
      v0 = 1e9,
      v1 = -1e9;
    for (const X of [x0, x0 + d])
      for (const Y of [-w / 2, w / 2])
        for (const Z of [0, zt]) {
          const q = proj(X, Y, Z);
          if (!q) return null;
          u0 = Math.min(u0, q[0]);
          u1 = Math.max(u1, q[0]);
          v0 = Math.min(v0, q[1]);
          v1 = Math.max(v1, q[1]);
        }
    return { bw: (u1 - u0) * k, bh: (v1 - v0) * k };
  };
  let ru0 = 1e9,
    ru1 = -1e9,
    rv0 = 1e9,
    rv1 = -1e9;
  for (const X of [x1, x2])
    for (const Y of [-Wz / 2, Wz / 2]) {
      const q = proj(X, Y, 0);
      if (q) {
        ru0 = Math.min(ru0, q[0]);
        ru1 = Math.max(ru1, q[0]);
        rv0 = Math.min(rv0, q[1]);
        rv1 = Math.max(rv1, q[1]);
      }
    }
  const roiW = Math.min(Nu, ru1 - ru0),
    roiH = Math.min(Nv, rv1 - rv0);
  const feedInfo = (feed, inp, ovp) => {
    const ov = Math.min(0.9, Math.max(0, (ovp || 0) / 100));
    let msc = 1,
      tiles = 1,
      nx = 1,
      ny = 1;
    if (feed === "full") msc = Math.min(1, inp / Math.max(Nu, Nv));
    else if (feed === "roi") msc = Math.min(1, inp / Math.max(roiW, roiH));
    else {
      const step = inp * (1 - ov);
      nx = roiW > inp ? Math.ceil((roiW - inp) / step) + 1 : 1;
      ny = roiH > inp ? Math.ceil((roiH - inp) / step) + 1 : 1;
      tiles = nx * ny;
    }
    return {
      feed,
      inp,
      msc,
      tiles,
      nx,
      ny,
      txt:
        feed === "tiles"
          ? t("feedTiles", tiles, nx, ny, inp)
          : feed === "roi"
            ? t("feedRoi", Math.round(roiW), Math.round(roiH), inp)
            : t("feedFull", Nu, Nv, inp),
    };
  };
  const objs = T.objs.map((o) => {
    const w = P(o.w) / 100,
      d = P(o.d) / 100,
      zh = P(o.z) / 100,
      req = P(o.req),
      inp = P(o.inp) || 640;
    const fi = feedInfo(o.feed, inp, P(o.ov));
    if (
      ![w, d, zh].every((x) => isFinite(x) && x >= 0) ||
      Math.max(w, d, zh) <= 0 ||
      !(req > 0)
    )
      return { ...o, bad: true, fi };
    const span0 = Math.max(0, x2 - x1 - d);
    let best = null;
    for (let i = 0; i <= 40; i++) {
      const x0 = x1 + (span0 * i) / 40,
        b = boxPx(x0, w, d, zh);
      if (!b) continue;
      const mm = Math.min(b.bw, b.bh);
      if (!best || mm < best.m) best = { ...b, m: mm, x0 };
    }
    if (!best) return { ...o, bad: true, fi };
    const mm = best.m * fi.msc,
      stt = mm >= req ? "ok" : mm >= 0.75 * req ? "warn" : "bad";
    return {
      ...o,
      ...best,
      reqN: req,
      fi,
      mm,
      st: stt,
      NwMin: (Nw * req) / best.m,
      sensorOk: best.m >= req,
    };
  });
  // вердикт
  const notes = [];
  const clamped = fWant != null && Math.abs(fWant - f) > 0.05;
  if (m !== "auto" || clamped) {
    if (W(zMin) < Wz) notes.push(t("nZoneW", fmt(W(zMin), 2), fmt(Wz, 2)));
    if (vf < span) notes.push(t("nZoneD", fmt(span / R, 1), fmt(vf / R, 1)));
  }
  if (clamped)
    notes.unshift(t(fWant > f ? "nFMax" : "nFMin", fmt(fWant, 1), fmt(f, 1)));
  else if (
    m !== "auto" &&
    cam &&
    cam.fmin > 0 &&
    (f < cam.fmin * 0.98 || f > cam.fmax * 1.02)
  )
    notes.push(
      t(
        "nFOut",
        fmt(f, 1),
        cam.fmin === cam.fmax
          ? fmt(cam.fmin, 1)
          : fmt(cam.fmin, 1) + "–" + fmt(cam.fmax, 1),
      ),
    );
  if (hf / R > 100) notes.push(t("nWide", fmt(hf / R, 0)));
  if (tilt / R > 75 && x1 < 0) notes.push(t("nTop"));
  const thLow = Math.atan2(Hc, Math.max(Math.abs(x1), Math.abs(x2)));
  if (thLow / R < 15) notes.push(t("nLowRay", fmt(thLow / R, 0)));
  if (afps0 > fps) notes.push(t("nAfps", fmt(afps0, 0), fmt(fps, 0)));
  const pxs = (o) => `${fmt(o.bw, 1)} × ${fmt(o.bh, 1)}\u00a0px`,
    pxm = (o) =>
      `${fmt(o.bw * o.fi.msc, 1)} × ${fmt(o.bh * o.fi.msc, 1)}\u00a0px`;
  const valid = objs.filter((o) => !o.bad),
    fails = valid.filter((o) => o.st === "bad"),
    edge = valid.filter((o) => o.st === "warn");
  let cls, pill, head;
  if (!valid.length) {
    cls = "warn";
    pill = t("pNoObj");
    head = t("hNoObj");
  } else if (fails.length) {
    cls = "bad";
    pill = t("pBad");
    head = t(
      "hBad",
      fails
        .map((o) =>
          t("hItem", o.name || t("objDefault"), pxm(o), fmt(o.reqN, 0)),
        )
        .join("; "),
    );
    fails
      .filter((o) => o.sensorOk)
      .forEach((o) => {
        const need = Math.ceil((o.fi.inp * o.reqN) / o.mm / 32) * 32;
        notes.push(
          t(
            "nScale",
            o.name,
            pxs(o),
            o.fi.inp,
            t(
              o.feed === "full"
                ? "advFull"
                : o.feed === "roi"
                  ? "advRoi"
                  : "advTiles",
            ),
            fmt(need, 0),
          ),
        );
      });
    const short = fails.filter((o) => !o.sensorOk);
    if (short.length) {
      const worst = short.reduce((a, b) => (a.NwMin > b.NwMin ? a : b)),
        rec = RES.find((r) => r[1] >= worst.NwMin);
      notes.unshift(
        rec
          ? t("nRes", worst.name, fmt(worst.NwMin, 0), rec[0])
          : t("nResNone", worst.name, fmt(worst.NwMin, 0)),
      );
    }
  } else if (edge.length) {
    cls = "warn";
    pill = t("pWarn");
    head = t(
      "hWarn",
      edge
        .map((o) =>
          t("hItem", o.name || t("objDefault"), pxm(o), fmt(o.reqN, 0)),
        )
        .join("; "),
    );
  } else {
    const sm = valid.reduce((a, b) => (a.mm < b.mm ? a : b));
    cls = "ok";
    pill = t("pOk");
    head = t("hOk", sm.name, pxm(sm));
  }
  if (notes.length && cls === "ok") {
    cls = "warn";
    pill = t("pCheck");
  }
  // группы запусков: одна модель с одинаковой подачей обслуживает свои объекты одним проходом
  const groups = [];
  objs
    .filter((o) => o.fi)
    .forEach((o) => {
      const key = [
        o.model,
        o.feed,
        o.fi.inp,
        o.feed === "tiles" ? o.ov : "",
        o.model === "custom" ? o.fps + "@" + o.ref : "",
      ].join("|");
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = {
          key,
          model: o.model,
          feed: o.feed,
          fi: o.fi,
          fps: o.fps,
          ref: o.ref,
          names: [],
          type: T.name,
          load: count * afps * o.fi.tiles,
        };
        groups.push(g);
      }
      g.names.push(o.name || t("objDefault"));
    });
  const X = (vel * maxR) / bl;
  const mb = (Nw * Nh * fps * bpp * sc) / 1e6;
  return {
    ...base,
    err: false,
    clamped,
    fWant,
    cam,
    pos,
    m,
    H,
    h,
    Hc,
    L0,
    Dz,
    Wz,
    x1,
    x2,
    tilt,
    span,
    hf,
    vf,
    f,
    rot,
    Nu,
    Nv,
    fpx,
    W,
    zOf,
    P1,
    P2,
    minA,
    minD,
    maxR,
    objs,
    valid,
    notes,
    cls,
    pill,
    head,
    pxs,
    pxm,
    groups,
    X,
    vel,
    bl,
    mb,
    k,
    decUnits: (count * Nu * Nv * fps) / (1920 * 1080 * 30),
    frameGB: (Nu * Nv * 1.5) / 1e9,
  };
}
