// ---------- шаблоны камер и детекторов
const CAM_BUILTIN = [
  {
    id: "k4",
    name: STR.camBuiltin.k4,
    Nw: 2560,
    Nh: 1440,
    sw: 5.4,
    fmin: 2.8,
    fmax: 12,
  },
  {
    id: "k8",
    name: STR.camBuiltin.k8,
    Nw: 3840,
    Nh: 2160,
    sw: 7.68,
    fmin: 2.8,
    fmax: 12,
  },
];
let CAMS_C = [],
  DETS = [];
const allCams = () => [...CAM_BUILTIN, ...CAMS_C];
const camById = (id) => allCams().find((c) => c.id === id);
const modelById = (id) =>
  MODELS.find((x) => x.id === id) || DETS.find((x) => x.id === id);
function buildCamSelect() {
  const sel = byId("camera"),
    cur = sel.value;
  sel.innerHTML =
    `<option value="">${t("camManual")}</option>` +
    allCams()
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
  sel.value = camById(cur) ? cur : "";
}

// ---------- карточки объектов
function renderObjs() {
  const T = act(),
    L = byId("objList");
  L.innerHTML = "";
  T.objects.forEach((o, i) => {
    if (!modelById(o.model)) o.model = "y26s";
    const r = document.createElement("article");
    r.className = "ocard";
    const mopts =
      `<optgroup label="${t("ultralytics")}">${MODELS.map((mm) => `<option value="${mm.id}">${mm.name}</option>`).join("")}</optgroup>` +
      (DETS.length
        ? `<optgroup label="${t("ownDets")}">${DETS.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join("")}</optgroup>`
        : "");
    r.innerHTML = `<div class="ohdr"><span class="dot" id="odot-${i}" aria-hidden="true"></span><input id="on-${i}" aria-label="${t("objName")}"><button type="button" class="odel" aria-label="${t("objDel")}">×</button></div>
      <div class="ogrid">
        <div class="f"><label for="ow-${i}">${t("ow")}</label><input id="ow-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="od-${i}">${t("od")}</label><input id="od-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="oz-${i}">${t("oz")}</label><input id="oz-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f"><label for="oq-${i}">${t("oq")}</label><input id="oq-${i}" type="number" step="any" inputmode="decimal"></div>
        <div class="f c2"><label for="om-${i}">${t("om")}</label><select id="om-${i}">${mopts}</select></div>
        <div class="f"><label for="of-${i}">${t("of")}</label><select id="of-${i}">${Object.entries(
          FEEDS,
        )
          .map(([k, v]) => `<option value="${k}">${v}</option>`)
          .join("")}</select></div>
        <div class="f"><label for="oi-${i}">${t("oi")}</label><select id="oi-${i}" style="font-family:var(--mono)">${INPUTS.map((x) => `<option>${x}</option>`).join("")}</select></div>
        <div class="f" id="ovw-${i}"><label for="ov-${i}">${t("ov")}</label><input id="ov-${i}" type="number" step="any" inputmode="decimal"></div>
      </div>
      <div class="ores" id="ores-${i}" aria-live="polite"></div>`;
    L.append(r);
    const sync = () => {
      byId(`ovw-${i}`).hidden = o.feed !== "tiles";
    };
    [
      ["on", "name"],
      ["ow", "width"],
      ["od", "length"],
      ["oz", "height"],
      ["oq", "requiredPx"],
      ["ov", "overlap"],
    ].forEach(([p, f]) => {
      const el = byId(`${p}-${i}`);
      el.value = o[f] ?? "";
      el.addEventListener("input", (e) => {
        e.stopPropagation();
        o[f] = e.target.value;
        if (f === "name") delete o.nameKey;
        calcAll();
      });
    });
    [
      ["om", "model"],
      ["of", "feed"],
      ["oi", "inputSize"],
    ].forEach(([p, f]) => {
      const el = byId(`${p}-${i}`);
      el.value = String(o[f]);
      if (el.selectedIndex < 0) el.selectedIndex = 0;
      el.addEventListener("change", (e) => {
        e.stopPropagation();
        o[f] = e.target.value;
        sync();
        calcAll();
      });
    });
    r.querySelector(".odel").addEventListener("click", () => {
      T.objects.splice(i, 1);
      renderObjs();
      calcAll();
    });
    sync();
  });
}
function syncFormUI(T, result) {
  const inputs = T.inputs,
    cam = camById(inputs.camera);
  byId("fBox").hidden = inputs.lensMode !== "focal";
  byId("aBox").hidden = inputs.lensMode !== "angle";
  byId("L0box").hidden = inputs.placement === "top";
  const sv = (SENSORS[+inputs.sensor] || SENSORS[3])[1];
  byId("resolution").disabled = !!cam;
  byId("sensor").disabled = !!cam;
  byId("ppBox").hidden = !!cam || sv !== "pp";
  byId("sensorWidth").readOnly = !!cam || sv !== null;
  if (result && isFinite(result.s) && (cam || sv !== null))
    byId("sensorWidth").value = +result.s.toFixed(2);
  byId("sumGeo").textContent =
    `${t(inputs.placement === "top" ? "sumTop" : "sumSide")}, ${U(formatNumber(parseNum(inputs.cameraHeight), 1), "m")}, ${formatNumber(parseNum(inputs.zoneWidth), 1)} × ${U(formatNumber(parseNum(inputs.zoneDepth), 1), "m")}`;
  byId("sumCam").textContent =
    (cam
      ? `${cam.Nw} × ${cam.Nh}`
      : (RESOLUTIONS[+inputs.resolution] || RESOLUTIONS[1])[0].split(
          " · ",
        )[0]) +
    (result && !result.err ? `, f ${U(formatNumber(result.f, 1), "mm")}` : "");
  byId("sumStr").textContent =
    `${U(formatNumber(parseNum(inputs.fps), 0), "fps")}, ${inputs.codec === "0.04" ? "H.265" : "H.264"}`;
}
