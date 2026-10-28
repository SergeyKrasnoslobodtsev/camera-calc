const $=id=>document.getElementById(id);
const R=Math.PI/180;
const fmt=(x,d=1)=>isFinite(x)?x.toLocaleString("ru-RU",{minimumFractionDigits:d,maximumFractionDigits:d}):"—";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const P=x=>parseFloat(String(x??"").replace(",","."));
const uid=()=>Math.random().toString(36).slice(2,9);

// ---------- справочники
const RES=[["2 Мп · 1920×1080",1920,1080],["4 Мп · 2560×1440",2560,1440],["5 Мп · 2592×1944",2592,1944],["5 Мп · 2880×1620",2880,1620],["6 Мп · 3072×2048",3072,2048],["8 Мп · 3840×2160",3840,2160],["12 Мп · 4000×3000",4000,3000]];
const SENS=[['1/3"',4.8],['1/2.9"',5.0],['1/2.8"',5.6],['1/2.7"',5.4],['1/2.5"',5.8],['1/1.8" 16:9',7.7],['1/1.2" 16:9',11.2],['По размеру пикселя','pp'],['Своя',null]];
// Каталог: tf — FP16 Tensor dense, TFLOPS (GeForce — с FP32-накоплением). price — ориентир, $, октябрь 2026
const CATALOG=[
 {id:"5090",name:"GeForce RTX 5090",arch:"Blackwell",tf:209.5,nvdec:2,mem:32,tdp:575,price:5000,note:"цена — уличная на октябрь 2026, рекомендованная NVIDIA $1 999"},
 {id:"pro6000",name:"RTX PRO 6000 Blackwell",arch:"Blackwell",tf:500,nvdec:4,mem:96,tdp:600,price:13250,note:"FP16 dense оценён как 4 PFLOPS FP4 / 8, по соотношению у RTX 5090"},
 {id:"l40s",name:"L40S",arch:"Ada",tf:362,nvdec:3,mem:48,tdp:350,price:9000},
 {id:"h100nvl",name:"H100 NVL",arch:"Hopper",tf:835.5,nvdec:7,mem:94,tdp:400,price:27500},
 {id:"h200nvl",name:"H200 NVL",arch:"Hopper",tf:835.5,nvdec:7,mem:141,tdp:600,price:32000},
 {id:"agx",name:"Jetson AGX Orin 64GB",arch:"Ampere",tf:42.6,st:{h265:22,h264:11.6},mem:64,tdp:60,price:3499,jet:true,note:"отдельный модуль; память общая с CPU, под модели берётся 60%; FP16 оценён: 16 SM × 2048 FLOP/такт × 1,3 ГГц"}
];
let CUSTOM=[];            // свои карты: {id,name,arch,tf,nvdec|st,mem,tdp,price,jet,custom:true}
let PRICE={}, ON={};      // правки цен и участие в подборе по id
const allGpus=()=>[...CATALOG,...CUSTOM];
const gpuById=id=>allGpus().find(g=>g.id===id);
const priceOf=g=>{const x=P(PRICE[g.id]);return x>0?x:g.price};
const isOn=g=>ON[g.id]!==false;
// 1080p к/с на один NVDEC (NVIDIA Video Codec SDK 13.0, NVDEC Application Note); Hopper = Turing
const NVDEC_FPS={Turing:{h264:771,h265:1316},Hopper:{h264:771,h265:1316},Ampere:{h264:748,h265:1415},Ada:{h264:903,h265:1641},Blackwell:{h264:2172,h265:1872}};
const decStreams=(g,codec)=>g.st?g.st[codec]:g.nvdec*NVDEC_FPS[g.arch][codec]/30;
const decText=g=>g.st?`${fmt(g.st.h265,0)} потоков`:`${g.nvdec} NVDEC`;
// Модели: GFLOPs и задержка на T4 TensorRT FP16, batch 1, вход 640 (docs.ultralytics.com)
const MODELS=[
 ["y26n","YOLO26n",5.5,1.7],["y26s","YOLO26s",20.9,2.5],["y26m","YOLO26m",68.4,4.7],["y26l","YOLO26l",86.8,6.2],["y26x","YOLO26x",194.4,11.8],
 ["y26np","YOLO26n-pose",7.6,1.8],["y26sp","YOLO26s-pose",24.1,2.7],["y26mp","YOLO26m-pose",73.3,5.0],["y26lp","YOLO26l-pose",91.7,6.5],["y26xp","YOLO26x-pose",202.3,12.2],
 ["y11n","YOLO11n",6.5,1.5],["y11s","YOLO11s",21.6,2.5],["y11m","YOLO11m",68.1,4.7],["y11l","YOLO11l",87.2,6.2],["y11x","YOLO11x",195.3,11.3]
].map(([id,name,gf,ms])=>({id,name,gf,ms}));
const T4TF=65; // T4: 65 TFLOPS FP16, на ней сняты замеры Ultralytics
const FEEDS={roi:"Вырез зоны",tiles:"Тайлы",full:"Весь кадр"};
const FEED_SHORT={roi:"вырез",tiles:"тайлы",full:"весь кадр"};
const INPUTS=[320,416,512,640,768,960,1024,1280];
