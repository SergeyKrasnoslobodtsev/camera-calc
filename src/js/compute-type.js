import { t } from "./i18n.js";
import { DEG, RESOLUTIONS, SENSORS, formatNumber, parseNum } from "./data.js";
import { cameraById } from "./objects.js";
// ---------- расчёт одного типа камер (без DOM)
// Обозначения из формул (src/formulas.html):
//   H — высота камеры, h — высота плоскости объектов, Hc = H − h — высота камеры над плоскостью, м;
//   x — расстояние по полу от точки под камерой, x1 и x2 — края зоны, м;
//   s — ширина матрицы, мм; f — фокусное расстояние, мм; Nw × Nh — разрешение кадра, px;
//   fpx — фокусное расстояние в пикселях; φ (phi) — угол луча к плоскости; D — расстояние до точки, м;
//   δ (delta) — угол луча к оптической оси; z — глубина по оптической оси, м; k — поправка объектива.
export function computeType(type) {
  const inputs = type.inputs,
    mode = inputs.lensMode,
    placement = inputs.placement,
    count = Math.max(0, Math.round(parseNum(type.count)) || 0);
  const camera = cameraById(inputs.camera);
  let [cameraLabel, Nw, Nh] = RESOLUTIONS[+inputs.resolution] || RESOLUTIONS[1];
  const sensorPreset = (SENSORS[+inputs.sensor] || SENSORS[3])[1];
  let s =
    typeof sensorPreset === "number"
      ? sensorPreset
      : sensorPreset === "pp"
        ? (parseNum(inputs.pixelPitch) * Nw) / 1000
        : parseNum(inputs.sensorWidth);
  if (camera) {
    cameraLabel = camera.name;
    Nw = camera.Nw;
    Nh = camera.Nh;
    s = camera.sensorWidth;
  }
  const H = parseNum(inputs.cameraHeight),
    h = parseNum(inputs.planeHeight),
    zoneStart = parseNum(inputs.zoneStart),
    zoneDepth = parseNum(inputs.zoneDepth),
    zoneWidth = parseNum(inputs.zoneWidth),
    margin = (parseNum(inputs.margin) || 0) / 100,
    k = parseNum(inputs.lensFactor),
    speed = parseNum(inputs.speed),
    blurPx = parseNum(inputs.blurPx);
  const fps = parseNum(inputs.fps),
    bpp = +inputs.codec,
    sceneFactor = +inputs.scene,
    analyticsFpsSet = parseNum(inputs.analyticsFps),
    analyticsFps = Math.min(analyticsFpsSet, fps),
    codec = bpp < 0.055 ? "h265" : "h264";
  const Hc = H - h;
  const common = {
    type,
    count,
    cameraLabel,
    Nw,
    Nh,
    s,
    fps,
    analyticsFps,
    analyticsFpsSet,
    codec,
    bpp,
    sceneFactor,
  };
  if (
    ![H, h, zoneDepth, zoneWidth, s, k].every(isFinite) ||
    (placement === "side" && !isFinite(zoneStart)) ||
    Hc <= 0 ||
    zoneDepth <= 0 ||
    zoneWidth <= 0 ||
    !(s > 0)
  )
    return { ...common, err: true };
  const x1 = placement === "top" ? -zoneDepth / 2 : zoneStart,
    x2 = x1 + zoneDepth;
  const phi1 = Math.atan2(Hc, x1),
    phi2 = Math.atan2(Hc, x2);
  const zoneAngle = phi1 - phi2,
    tilt = (phi1 + phi2) / 2;
  const depthAt = (x) => x * Math.cos(tilt) + Hc * Math.sin(tilt);
  const minDepth = Math.min(depthAt(x1), depthAt(x2));
  // кадр в альбомной (rotated = false) или портретной ориентации
  const fitOrientation = (rotated) => {
    const frameWidthPx = rotated ? Nh : Nw,
      frameHeightPx = rotated ? Nw : Nh,
      sensorWidth = rotated ? (s * Nh) / Nw : s,
      aspect = frameWidthPx / frameHeightPx;
    let hfov,
      f,
      fNeeded = null;
    if (mode === "auto") {
      const hfovNeeded =
          2 * Math.atan((zoneWidth * (1 + margin)) / 2 / minDepth),
        vfovNeeded = zoneAngle * (1 + margin);
      hfov = Math.max(
        hfovNeeded,
        2 * Math.atan(aspect * Math.tan(vfovNeeded / 2)),
      );
      f = sensorWidth / (2 * Math.tan(hfov / 2));
      fNeeded = f;
      if (camera && camera.focalMin > 0) {
        const fClamped = Math.min(
          camera.focalMax,
          Math.max(camera.focalMin, f),
        );
        if (Math.abs(fClamped - f) > 1e-6) {
          f = fClamped;
          hfov = 2 * Math.atan(sensorWidth / (2 * f));
        }
      }
    } else if (mode === "focal") {
      f = parseNum(inputs.focalLength);
      hfov = 2 * Math.atan(sensorWidth / (2 * f));
    } else {
      hfov = parseNum(inputs.hfov) * DEG;
      f = sensorWidth / (2 * Math.tan(hfov / 2));
    }
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect),
      fpx = frameWidthPx / (2 * Math.tan(hfov / 2));
    return {
      rotated,
      frameWidthPx,
      frameHeightPx,
      hfov,
      f,
      fNeeded,
      vfov,
      fpx,
      fits: 2 * minDepth * Math.tan(hfov / 2) >= zoneWidth && vfov >= zoneAngle,
    };
  };
  let fit;
  if (inputs.orientation === "landscape") fit = fitOrientation(false);
  else if (inputs.orientation === "portrait") fit = fitOrientation(true);
  else {
    const landscape = fitOrientation(false),
      portrait = fitOrientation(true);
    fit =
      mode === "auto"
        ? portrait.fpx > landscape.fpx * 1.02
          ? portrait
          : landscape
        : landscape.fits || !portrait.fits
          ? landscape
          : portrait;
  }
  const { rotated, hfov, f, fNeeded, vfov, fpx, frameWidthPx, frameHeightPx } =
    fit;
  if (!isFinite(fpx) || fpx <= 0) return { ...common, err: true };
  const frameWidthAt = (z) => 2 * z * Math.tan(hfov / 2);
  // плотность пикселей (px/м) поперёк и вглубь в точке x
  const densityAt = (x) => {
    const phi = Math.atan2(Hc, x),
      D = Math.hypot(Hc, x),
      delta = phi - tilt,
      z = D * Math.cos(delta);
    return {
      x,
      D,
      z,
      phi,
      across: fpx / z,
      depth: (fpx * Math.sin(phi)) / (D * Math.cos(delta) ** 2),
    };
  };
  const edge1 = densityAt(x1),
    edge2 = densityAt(x2),
    samples = [];
  for (let i = 0; i <= 40; i++)
    samples.push(densityAt(x1 + ((x2 - x1) * i) / 40));
  const minAcross = Math.min(...samples.map((sample) => sample.across)),
    minDepthDensity = Math.min(...samples.map((sample) => sample.depth)),
    maxDensity = Math.max(
      ...samples.map((sample) => Math.max(sample.across, sample.depth)),
    );
  // точная проекция коробки Ш×Д×В, стоящей на плоскости по центру кадра
  const cosTilt = Math.cos(tilt),
    sinTilt = Math.sin(tilt);
  // точка (x — вдоль пола, y — поперёк, height — над плоскостью) → координаты в кадре, px
  const project = (x, y, height) => {
    const dh = height - Hc,
      z = x * cosTilt - dh * sinTilt;
    if (z <= 1e-6) return null;
    return [(fpx * y) / z, (fpx * (x * sinTilt + dh * cosTilt)) / z];
  };
  const boxSizePx = (x0, width, length, height) => {
    const topHeight = Math.min(height, Hc * 0.98);
    let uMin = 1e9,
      uMax = -1e9,
      vMin = 1e9,
      vMax = -1e9;
    for (const x of [x0, x0 + length])
      for (const y of [-width / 2, width / 2])
        for (const pointHeight of [0, topHeight]) {
          const point = project(x, y, pointHeight);
          if (!point) return null;
          uMin = Math.min(uMin, point[0]);
          uMax = Math.max(uMax, point[0]);
          vMin = Math.min(vMin, point[1]);
          vMax = Math.max(vMax, point[1]);
        }
    return { widthPx: (uMax - uMin) * k, heightPx: (vMax - vMin) * k };
  };
  // область зоны в кадре (ROI)
  let roiUMin = 1e9,
    roiUMax = -1e9,
    roiVMin = 1e9,
    roiVMax = -1e9;
  for (const x of [x1, x2])
    for (const y of [-zoneWidth / 2, zoneWidth / 2]) {
      const point = project(x, y, 0);
      if (point) {
        roiUMin = Math.min(roiUMin, point[0]);
        roiUMax = Math.max(roiUMax, point[0]);
        roiVMin = Math.min(roiVMin, point[1]);
        roiVMax = Math.max(roiVMax, point[1]);
      }
    }
  const roiW = Math.min(frameWidthPx, roiUMax - roiUMin),
    roiH = Math.min(frameHeightPx, roiVMax - roiVMin);
  // подача кадра в модель: весь кадр, вырез ROI или тайлы
  const describeFeed = (feed, inputSize, overlapPct) => {
    const overlap = Math.min(0.9, Math.max(0, (overlapPct || 0) / 100));
    let modelScale = 1,
      tiles = 1,
      tilesX = 1,
      tilesY = 1;
    if (feed === "full")
      modelScale = Math.min(
        1,
        inputSize / Math.max(frameWidthPx, frameHeightPx),
      );
    else if (feed === "roi")
      modelScale = Math.min(1, inputSize / Math.max(roiW, roiH));
    else {
      const step = inputSize * (1 - overlap);
      tilesX = roiW > inputSize ? Math.ceil((roiW - inputSize) / step) + 1 : 1;
      tilesY = roiH > inputSize ? Math.ceil((roiH - inputSize) / step) + 1 : 1;
      tiles = tilesX * tilesY;
    }
    return {
      feed,
      inputSize,
      modelScale,
      tiles,
      tilesX,
      tilesY,
      text:
        feed === "tiles"
          ? t("feedTiles", tiles, tilesX, tilesY, inputSize)
          : feed === "roi"
            ? t("feedRoi", Math.round(roiW), Math.round(roiH), inputSize)
            : t("feedFull", frameWidthPx, frameHeightPx, inputSize),
    };
  };
  const objs = type.objects.map((obj) => {
    const width = parseNum(obj.width) / 100,
      length = parseNum(obj.length) / 100,
      height = parseNum(obj.height) / 100,
      requiredPx = parseNum(obj.requiredPx),
      inputSize = parseNum(obj.inputSize) || 640;
    const feedInfo = describeFeed(obj.feed, inputSize, parseNum(obj.overlap));
    if (
      ![width, length, height].every((size) => isFinite(size) && size >= 0) ||
      Math.max(width, length, height) <= 0 ||
      !(requiredPx > 0)
    )
      return { ...obj, bad: true, feedInfo };
    // ищем положение объекта в зоне, где его рамка меньше всего
    const travel = Math.max(0, x2 - x1 - length);
    let worst = null;
    for (let i = 0; i <= 40; i++) {
      const x0 = x1 + (travel * i) / 40,
        box = boxSizePx(x0, width, length, height);
      if (!box) continue;
      const minSidePx = Math.min(box.widthPx, box.heightPx);
      if (!worst || minSidePx < worst.minSidePx)
        worst = { ...box, minSidePx, x0 };
    }
    if (!worst) return { ...obj, bad: true, feedInfo };
    const modelPx = worst.minSidePx * feedInfo.modelScale,
      status =
        modelPx >= requiredPx
          ? "ok"
          : modelPx >= 0.75 * requiredPx
            ? "warn"
            : "bad";
    return {
      ...obj,
      ...worst,
      requiredPx,
      feedInfo,
      modelPx,
      status,
      minSensorWidthPx: (Nw * requiredPx) / worst.minSidePx,
      sensorOk: worst.minSidePx >= requiredPx,
    };
  });
  // вердикт
  const notes = [];
  const clamped = fNeeded != null && Math.abs(fNeeded - f) > 0.05;
  if (mode !== "auto" || clamped) {
    if (frameWidthAt(minDepth) < zoneWidth)
      notes.push(
        t(
          "noteZoneWidth",
          formatNumber(frameWidthAt(minDepth), 2),
          formatNumber(zoneWidth, 2),
        ),
      );
    if (vfov < zoneAngle)
      notes.push(
        t(
          "noteZoneDepth",
          formatNumber(zoneAngle / DEG, 1),
          formatNumber(vfov / DEG, 1),
        ),
      );
  }
  if (clamped)
    notes.unshift(
      t(
        fNeeded > f ? "noteFocalMax" : "noteFocalMin",
        formatNumber(fNeeded, 1),
        formatNumber(f, 1),
      ),
    );
  else if (
    mode !== "auto" &&
    camera &&
    camera.focalMin > 0 &&
    (f < camera.focalMin * 0.98 || f > camera.focalMax * 1.02)
  )
    notes.push(
      t(
        "noteFocalOutOfRange",
        formatNumber(f, 1),
        camera.focalMin === camera.focalMax
          ? formatNumber(camera.focalMin, 1)
          : formatNumber(camera.focalMin, 1) +
              "–" +
              formatNumber(camera.focalMax, 1),
      ),
    );
  if (hfov / DEG > 100)
    notes.push(t("noteWideAngle", formatNumber(hfov / DEG, 0)));
  if (tilt / DEG > 75 && x1 < 0) notes.push(t("noteTopView"));
  const lowestRayAngle = Math.atan2(Hc, Math.max(Math.abs(x1), Math.abs(x2)));
  if (lowestRayAngle / DEG < 15)
    notes.push(t("noteLowRay", formatNumber(lowestRayAngle / DEG, 0)));
  if (analyticsFpsSet > fps)
    notes.push(
      t(
        "noteAnalyticsFps",
        formatNumber(analyticsFpsSet, 0),
        formatNumber(fps, 0),
      ),
    );
  // размер объекта на матрице и на входе модели
  const sensorPxText = (obj) =>
      `${formatNumber(obj.widthPx, 1)} × ${formatNumber(obj.heightPx, 1)} px`,
    modelPxText = (obj) =>
      `${formatNumber(obj.widthPx * obj.feedInfo.modelScale, 1)} × ${formatNumber(obj.heightPx * obj.feedInfo.modelScale, 1)} px`;
  const valid = objs.filter((obj) => !obj.bad),
    failing = valid.filter((obj) => obj.status === "bad"),
    marginal = valid.filter((obj) => obj.status === "warn");
  let status, pill, headline;
  if (!valid.length) {
    status = "warn";
    pill = t("pillNoObjects");
    headline = t("verdictNoObjects");
  } else if (failing.length) {
    status = "bad";
    pill = t("pillBad");
    headline = t(
      "verdictBad",
      failing
        .map((obj) =>
          t(
            "verdictItem",
            obj.name || t("objDefault"),
            modelPxText(obj),
            formatNumber(obj.requiredPx, 0),
          ),
        )
        .join("; "),
    );
    failing
      .filter((obj) => obj.sensorOk)
      .forEach((obj) => {
        const neededInput =
          Math.ceil(
            (obj.feedInfo.inputSize * obj.requiredPx) / obj.modelPx / 32,
          ) * 32;
        notes.push(
          t(
            "noteDownscale",
            obj.name,
            sensorPxText(obj),
            obj.feedInfo.inputSize,
            t(
              obj.feed === "full"
                ? "adviceFull"
                : obj.feed === "roi"
                  ? "adviceRoi"
                  : "adviceTiles",
            ),
            formatNumber(neededInput, 0),
          ),
        );
      });
    const lowResolution = failing.filter((obj) => !obj.sensorOk);
    if (lowResolution.length) {
      const worstObj = lowResolution.reduce((a, b) =>
          a.minSensorWidthPx > b.minSensorWidthPx ? a : b,
        ),
        recommended = RESOLUTIONS.find(
          (res) => res[1] >= worstObj.minSensorWidthPx,
        );
      notes.unshift(
        recommended
          ? t(
              "noteResolution",
              worstObj.name,
              formatNumber(worstObj.minSensorWidthPx, 0),
              recommended[0],
            )
          : t(
              "noteResolutionNone",
              worstObj.name,
              formatNumber(worstObj.minSensorWidthPx, 0),
            ),
      );
    }
  } else if (marginal.length) {
    status = "warn";
    pill = t("pillWarn");
    headline = t(
      "verdictWarn",
      marginal
        .map((obj) =>
          t(
            "verdictItem",
            obj.name || t("objDefault"),
            modelPxText(obj),
            formatNumber(obj.requiredPx, 0),
          ),
        )
        .join("; "),
    );
  } else {
    const smallest = valid.reduce((a, b) => (a.modelPx < b.modelPx ? a : b));
    status = "ok";
    pill = t("pillOk");
    headline = t("verdictOk", smallest.name, modelPxText(smallest));
  }
  if (notes.length && status === "ok") {
    status = "warn";
    pill = t("pillCheck");
  }
  // группы запусков: одна модель с одинаковой подачей обслуживает свои объекты одним проходом
  const groups = [];
  objs
    .filter((obj) => obj.feedInfo)
    .forEach((obj) => {
      const key = [
        obj.model,
        obj.feed,
        obj.feedInfo.inputSize,
        obj.feed === "tiles" ? obj.overlap : "",
        obj.model === "custom" ? obj.fps + "@" + obj.ref : "",
      ].join("|");
      let group = groups.find((existing) => existing.key === key);
      if (!group) {
        group = {
          key,
          model: obj.model,
          feed: obj.feed,
          feedInfo: obj.feedInfo,
          fps: obj.fps,
          ref: obj.ref,
          names: [],
          type: type.name,
          load: count * analyticsFps * obj.feedInfo.tiles,
        };
        groups.push(group);
      }
      group.names.push(obj.name || t("objDefault"));
    });
  // выдержка не длиннее 1 / shutterDenominator с, чтобы смаз не превысил blurPx
  const shutterDenominator = (speed * maxDensity) / blurPx;
  const bitrateMbps = (Nw * Nh * fps * bpp * sceneFactor) / 1e6;
  return {
    ...common,
    err: false,
    clamped,
    fNeeded,
    camera,
    placement,
    mode,
    H,
    h,
    Hc,
    zoneStart,
    zoneDepth,
    zoneWidth,
    x1,
    x2,
    tilt,
    zoneAngle,
    hfov,
    vfov,
    f,
    rotated,
    frameWidthPx,
    frameHeightPx,
    fpx,
    frameWidthAt,
    depthAt,
    edge1,
    edge2,
    minAcross,
    minDepthDensity,
    maxDensity,
    objs,
    valid,
    notes,
    status,
    pill,
    headline,
    sensorPxText,
    modelPxText,
    groups,
    shutterDenominator,
    speed,
    blurPx,
    bitrateMbps,
    k,
    decUnits: (count * frameWidthPx * frameHeightPx * fps) / (1920 * 1080 * 30),
    frameGB: (frameWidthPx * frameHeightPx * 1.5) / 1e9,
  };
}
