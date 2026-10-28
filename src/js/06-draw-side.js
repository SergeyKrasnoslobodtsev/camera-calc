function drawSide({ H, h, x1, x2, tilt, vf, Hc, pos, wN, wF }) {
  const Wv = 680,
    Hv = 510,
    ml = 64,
    mr = 60,
    mt = 28,
    mb = 74;
  const a1 = tilt + vf / 2,
    a2 = tilt - vf / 2;
  const hitX = (a) => (a > 0.02 && a < Math.PI - 0.02 ? Hc / Math.tan(a) : NaN);
  const fwd = hitX(a2),
    back = hitX(a1);
  const xmax = Math.max(
    x2 + 0.3,
    isFinite(fwd)
      ? Math.min(fwd, x2 + Math.abs(x2 - x1) * 0.6) + 0.3
      : x2 * 1.6 + 0.3,
  );
  const xmin = Math.min(
    -0.3,
    x1 - 0.3,
    isFinite(back) && back < 0
      ? Math.max(back, x1 - Math.abs(x2 - x1) * 0.6) - 0.3
      : -0.3,
  );
  const sc = Math.min(
    (Wv - ml - mr) / (xmax - xmin),
    (Hv - mt - mb) / (H * 1.04),
  );
  const ox = ml + (Wv - ml - mr - (xmax - xmin) * sc) / 2;
  const X = (x) => ox + (x - xmin) * sc,
    Y = (y) => Hv - mb - y * sc;
  const n = (v) => (+v).toFixed(1);
  const cx = X(0),
    cy = Y(H),
    yP = Y(h),
    y0 = Y(0),
    xL = X(xmin),
    xR = X(xmax);
  const ray = (a) => {
    const hx = hitX(a);
    if (isFinite(hx) && hx >= xmin && hx <= xmax) return [X(hx), yP];
    const b = Math.cos(a) >= 0 ? xmax : xmin;
    return [X(b), Y(H - b * Math.tan(a))];
  };
  const [p1x, p1y] = ray(a1),
    [p2x, p2y] = ray(a2),
    [cxr, cyr] = ray(tilt);
  let g = "";
  // сетка с шагом 1/2/5 м
  const st = [0.5, 1, 2, 5, 10].find((s) => s * sc >= 45) || 10;
  for (let x = Math.ceil(xmin / st) * st; x <= xmax + 1e-9; x += st)
    g += `<line x1="${n(X(x))}" y1="${n(Y(H * 1.04))}" x2="${n(X(x))}" y2="${n(y0)}" stroke="var(--grid)"/>`;
  for (let y = st; y <= H * 1.04 + 1e-9; y += st)
    g += `<line x1="${n(xL)}" y1="${n(Y(y))}" x2="${n(xR)}" y2="${n(Y(y))}" stroke="var(--grid)"/>`;
  // пол и плоскость интереса
  g += `<line x1="${n(xL - 24)}" y1="${n(y0)}" x2="${n(xR)}" y2="${n(y0)}" stroke="var(--muted)" stroke-width="2"/>`;
  if (h > 0.01)
    g += `<line x1="${n(xL)}" y1="${n(yP)}" x2="${n(xR)}" y2="${n(yP)}" stroke="var(--dash)" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  // поле зрения и ось
  g += `<polygon points="${n(cx)},${n(cy)} ${n(p1x)},${n(p1y)} ${n(p2x)},${n(p2y)}" fill="var(--wedge)"/>`;
  g += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(p1x)}" y2="${n(p1y)}" stroke="var(--wedge-line)" stroke-width="1.8"/><line x1="${n(cx)}" y1="${n(cy)}" x2="${n(p2x)}" y2="${n(p2y)}" stroke="var(--wedge-line)" stroke-width="1.8"/>`;
  g += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cxr)}" y2="${n(cyr)}" stroke="var(--wedge-line)" stroke-width="1.5" stroke-dasharray="7 6" opacity=".85"/>`;
  // зона
  const zx1 = X(x1),
    zx2 = X(x2),
    zw = zx2 - zx1;
  g += `<rect x="${n(zx1)}" y="${n(yP - 6)}" width="${n(zw)}" height="12" rx="2" fill="var(--accent)"/>`;
  const room = y0 - yP >= 40;
  const zLabY = room ? yP - 16 : yP - 40,
    fLabY = room ? yP + 28 : yP - 18;
  g += `<text x="${n((zx1 + zx2) / 2)}" y="${n(zLabY)}" text-anchor="middle" class="t-z">${t("dZone", fmt(x2 - x1, 1))}</text>`;
  if (isFinite(wN) && isFinite(wF)) {
    const nar = zw < 240;
    g += `<line x1="${n(zx1)}" y1="${n(yP + 7)}" x2="${n(zx1)}" y2="${n(yP + 13)}" stroke="var(--accent)" stroke-width="1.5"/><line x1="${n(zx2)}" y1="${n(yP + 7)}" x2="${n(zx2)}" y2="${n(yP + 13)}" stroke="var(--accent)" stroke-width="1.5"/>`;
    g += `<text x="${n(zx1)}" y="${n(fLabY)}" text-anchor="${nar ? "end" : "middle"}">${t("dFrame", fmt(wN, 1))}</text>`;
    g += `<text x="${n(zx2)}" y="${n(fLabY)}" text-anchor="${nar ? "start" : "middle"}">${t("dFrame", fmt(wF, 1))}</text>`;
  }
  // углы
  const dAx = (yP - cy) / Math.max(Math.sin(tilt), 0.05);
  const r2 = Math.max(40, Math.min(150, dAx * 0.55)),
    r1 = Math.max(28, Math.min(70, r2 * 0.47));
  const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  g += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx + r1 + 60)}" y2="${n(cy)}" stroke="var(--dim)" stroke-dasharray="4 4"/>`;
  const [t1x, t1y] = pt(r1, tilt);
  g += `<path d="M${n(cx + r1)},${n(cy)} A${r1},${r1} 0 0 1 ${n(t1x)},${n(t1y)}" fill="none" stroke="var(--fg)" stroke-width="1.5"/>`;
  const [tlx, tly] = pt(r1 + 10, tilt / 2);
  g += `<text x="${n(tlx)}" y="${n(tly + 5)}" class="t-b">${t("dTilt", fmt(tilt / R, 0))}</text>`;
  const [v1x, v1y] = pt(r2, a2),
    [v2x, v2y] = pt(r2, a1);
  g += `<path d="M${n(v1x)},${n(v1y)} A${n(r2)},${n(r2)} 0 0 1 ${n(v2x)},${n(v2y)}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
  const [vlx, vly] = pt(r2 + 12, tilt);
  g += `<text x="${n(vlx + 4)}" y="${n(vly + 5)}" class="t-a">VFOV ${fmt(vf / R, 0)}°</text>`;
  // камера
  g += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx)}" y2="${n(y0)}" stroke="var(--dim)" stroke-width="1.5"/>`;
  g += `<rect x="${n(cx - 16)}" y="${n(cy - 10)}" width="28" height="18" rx="3" fill="var(--fg)"/><circle cx="${n(cx + 12)}" cy="${n(cy - 1)}" r="4" fill="var(--bg)"/>`;
  // H слева
  const xd = Math.min(cx, xL) - 30;
  g += `<line x1="${n(xd)}" y1="${n(cy)}" x2="${n(xd)}" y2="${n(y0)}" stroke="var(--muted)"/><line x1="${n(xd - 6)}" y1="${n(cy)}" x2="${n(xd + 6)}" y2="${n(cy)}" stroke="var(--muted)"/><line x1="${n(xd - 6)}" y1="${n(y0)}" x2="${n(xd + 6)}" y2="${n(y0)}" stroke="var(--muted)"/>`;
  g += `<text x="${n(xd - 8)}" y="${n((cy + y0) / 2)}" transform="rotate(-90 ${n(xd - 8)} ${n((cy + y0) / 2)})" text-anchor="middle" class="t-b">${t("dH", fmt(H, 1))}</text>`;
  // h справа — повернута, не пересекается с подписями кадра
  if (h > 0.01) {
    const xh = xR + 22,
      ym = (yP + y0) / 2;
    g += `<line x1="${n(xh)}" y1="${n(yP)}" x2="${n(xh)}" y2="${n(y0)}" stroke="var(--muted)"/><line x1="${n(xh - 6)}" y1="${n(yP)}" x2="${n(xh + 6)}" y2="${n(yP)}" stroke="var(--muted)"/><line x1="${n(xh - 6)}" y1="${n(y0)}" x2="${n(xh + 6)}" y2="${n(y0)}" stroke="var(--muted)"/>`;
    g += `<text x="${n(xh + 20)}" y="${n(ym)}" transform="rotate(-90 ${n(xh + 20)} ${n(ym)})" text-anchor="middle">${t("dh", fmt(h, 2))}</text>`;
  }
  // размеры по полу
  const yd = y0 + 26,
    yt = y0 + 47;
  const dim = (a, b, txt) => {
    g += `<line x1="${n(a)}" y1="${n(yd)}" x2="${n(b)}" y2="${n(yd)}" stroke="var(--muted)"/><line x1="${n(a)}" y1="${n(yd - 6)}" x2="${n(a)}" y2="${n(yd + 6)}" stroke="var(--muted)"/><line x1="${n(b)}" y1="${n(yd - 6)}" x2="${n(b)}" y2="${n(yd + 6)}" stroke="var(--muted)"/><text x="${n((a + b) / 2)}" y="${n(yt)}" text-anchor="middle">${txt}</text>`;
  };
  g += `<line x1="${n(zx1)}" y1="${n(yP + 6)}" x2="${n(zx1)}" y2="${n(yd - 6)}" stroke="var(--line)" stroke-dasharray="3 4"/><line x1="${n(zx2)}" y1="${n(yP + 6)}" x2="${n(zx2)}" y2="${n(yd - 6)}" stroke="var(--line)" stroke-dasharray="3 4"/>`;
  if (x1 > 0.05) {
    const w = zx1 - cx;
    dim(cx, zx1, t(w > 110 ? "dOffset" : "dLen", fmt(x1, 1)));
  }
  dim(zx1, zx2, t(zw > 170 ? "dDepth" : "dLen", fmt(x2 - x1, 1)));
  if (x1 <= 0.05)
    g += `<text x="${n(cx)}" y="${n(yt + 20)}" text-anchor="middle">${t(pos === "top" ? "dOverCenter" : "dOverZone")}</text>`;
  const s = $("side");
  s.innerHTML = g;
  s.setAttribute(
    "aria-label",
    t("dAria", {
      H: fmt(H, 1),
      tilt: fmt(tilt / R, 0),
      vf: fmt(vf / R, 0),
      x1: fmt(x1, 1),
      x2: fmt(x2, 1),
      h: fmt(h, 2),
      wN: isFinite(wN) && fmt(wN, 1),
      wF: fmt(wF, 1),
    }),
  );
}
