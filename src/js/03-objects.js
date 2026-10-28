// ---------- шаблоны камер и детекторов
const CAM_BUILTIN=[
 {id:"k4",name:"Типовая 4 Мп · 1/2.7″ · 2,8–12 мм",Nw:2560,Nh:1440,sw:5.4,fmin:2.8,fmax:12},
 {id:"k8",name:"Типовая 8 Мп · 1/1.8″ · 2,8–12 мм",Nw:3840,Nh:2160,sw:7.68,fmin:2.8,fmax:12}
];
let CAMS_C=[], DETS=[];
const allCams=()=>[...CAM_BUILTIN,...CAMS_C];
const camById=id=>allCams().find(c=>c.id===id);
const modelById=id=>MODELS.find(x=>x.id===id)||DETS.find(x=>x.id===id);
function buildCamSelect(){
  const sel=$("cam"),cur=sel.value;
  sel.innerHTML=`<option value="">Свои настройки матрицы</option>`+allCams().map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
  sel.value=camById(cur)?cur:"";
}

// ---------- карточки объектов
function renderObjs(){
  const T=act(),L=$("objList");L.innerHTML="";
  T.objs.forEach((o,i)=>{
    if(!modelById(o.model))o.model="y26s";
    const r=document.createElement("article");r.className="ocard";
    const mopts=`<optgroup label="Каталог Ultralytics">${MODELS.map(mm=>`<option value="${mm.id}">${mm.name}</option>`).join("")}</optgroup>`+
      (DETS.length?`<optgroup label="Свои детекторы">${DETS.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join("")}</optgroup>`:"");
    r.innerHTML=`<div class="ohdr"><span class="dot" id="odot-${i}" aria-hidden="true"></span><input id="on-${i}" aria-label="Название объекта"><button type="button" class="odel" aria-label="Удалить объект">×</button></div>
      <div class="ogrid">
        <div class="f"><label for="ow-${i}">Ширина, см</label><input id="ow-${i}" inputmode="decimal"></div>
        <div class="f"><label for="od-${i}">Длина, см</label><input id="od-${i}" inputmode="decimal"></div>
        <div class="f"><label for="oz-${i}">Высота, см</label><input id="oz-${i}" inputmode="decimal"></div>
        <div class="f"><label for="oq-${i}">Нужно, px</label><input id="oq-${i}" inputmode="decimal"></div>
        <div class="f c2"><label for="om-${i}">Модель</label><select id="om-${i}">${mopts}</select></div>
        <div class="f"><label for="of-${i}">Подача</label><select id="of-${i}">${Object.entries(FEEDS).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div>
        <div class="f"><label for="oi-${i}">Вход, px</label><select id="oi-${i}" style="font-family:var(--mono)">${INPUTS.map(x=>`<option>${x}</option>`).join("")}</select></div>
        <div class="f" id="ovw-${i}"><label for="ov-${i}">Перекрытие, %</label><input id="ov-${i}" inputmode="decimal"></div>
      </div>
      <div class="ores" id="ores-${i}" aria-live="polite"></div>`;
    L.append(r);
    const sync=()=>{$(`ovw-${i}`).hidden=o.feed!=="tiles"};
    [["on","name"],["ow","w"],["od","d"],["oz","z"],["oq","req"],["ov","ov"]].forEach(([p,f])=>{const el=$(`${p}-${i}`);el.value=o[f]??"";el.addEventListener("input",e=>{e.stopPropagation();o[f]=e.target.value;calcAll()})});
    [["om","model"],["of","feed"],["oi","inp"]].forEach(([p,f])=>{const el=$(`${p}-${i}`);el.value=String(o[f]);if(el.selectedIndex<0)el.selectedIndex=0;el.addEventListener("change",e=>{e.stopPropagation();o[f]=e.target.value;sync();calcAll()})});
    r.querySelector(".odel").addEventListener("click",()=>{T.objs.splice(i,1);renderObjs();calcAll()});
    sync();
  });
}
function syncFormUI(T,Rt){
  const v=T.v,cam=camById(v.cam);
  $("fBox").hidden=v.mode!=="f";$("aBox").hidden=v.mode!=="a";$("L0box").hidden=v.pos==="top";
  const sv=(SENS[+v.sens]||SENS[3])[1];
  $("res").disabled=!!cam;$("sens").disabled=!!cam;
  $("ppBox").hidden=!!cam||sv!=="pp";$("sw").readOnly=!!cam||sv!==null;
  if(Rt&&isFinite(Rt.s)&&(cam||sv!==null))$("sw").value=+Rt.s.toFixed(2);
  $("sumGeo").textContent=`${v.pos==="top"?"сверху":"сбоку"}, ${v.H} м, ${v.Wz}×${v.Dz} м`;
  $("sumCam").textContent=(cam?`${cam.Nw}×${cam.Nh}`:(RES[+v.res]||RES[1])[0].split(" · ")[0])+(Rt&&!Rt.err?`, f ${fmt(Rt.f,1)} мм`:"");
  $("sumStr").textContent=`${v.fps} к/с, ${v.codec==="0.04"?"H.265":"H.264"}`;
}

