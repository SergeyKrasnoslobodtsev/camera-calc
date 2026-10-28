const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const dom=new JSDOM(fs.readFileSync(__dirname+'/../dist/camera-calc.html','utf8'),{runScripts:'dangerously',url:'https://x.test/',pretendToBeVisual:true,beforeParse(w){w.scrollTo=()=>{}}});
const d=dom.window.document,w=dom.window;
w.scrollTo=()=>{};
w.addEventListener('error',e=>console.log('ERR',e.message));
const T=id=>d.getElementById(id).textContent.replace(/\s+/g,' ').trim();
const tbl=id=>[...d.querySelectorAll('#'+id+' tr')].map(r=>'   '+[...r.children].map(c=>c.textContent.replace(/\s+/g,' ').trim()).join(' | ')).join('\n');
const go=h=>{w.location.hash=h;w.dispatchEvent(new w.HashChangeEvent('hashchange'))};
const set=(id,v)=>d.getElementById(id).value=v;
const fire=(id,ev='input')=>d.getElementById(id).dispatchEvent(new w.Event(ev,{bubbles:true}));
console.log('SYS:',T('sysKpis'));
console.log('DSUM:',T('dsum'));
console.log('DONUT:',T('donut'),'| circles',d.querySelectorAll('#donut circle').length);
console.log('LEGEND:',[...d.querySelectorAll('#legend li')].map(l=>l.textContent.replace(/\s+/g,' ').trim()).join(' || '));
console.log('GAUGES:',T('gauges'));
console.log('VERDICT:',T('verdict'));console.log('FACTS:',T('facts'));
console.log('header btn:',T('tplBtn'),d.getElementById('tplBtn').getAttribute('href'));
// templates: cameras
go('#tpl-cams');
console.log('tpl visible',!d.getElementById('viewTpl').hidden,'cams',!d.getElementById('tpl-cams-v').hidden,'gpus',!d.getElementById('tpl-gpus-v').hidden);
console.log(tbl('camTbl'));
set('ncName','Тест-камера 8 Мп');set('ncW','3840');set('ncH','2160');set('ncPp','2');set('ncFmin','6');set('ncFmax','6');set('ncPrice','300');
d.getElementById('camForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
console.log('after add cam rows',d.querySelectorAll('#camTbl tr').length);
// detectors
go('#tpl-dets');
set('ndName','Детектор деталей');set('ndFps','900');set('ndInp','640');set('ndRef','l40s');
d.getElementById('detForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
console.log('det first row:',tbl('detTbl').split('\n')[1]);
d.getElementById('detForm').dispatchEvent(new w.Event('submit',{cancelable:true}));console.log('det err:',T('ndErr'));
// back to main, apply camera to type 1 and detector to object 2
go('');
const camSel=d.getElementById('cam');const custom=[...camSel.options].find(o=>o.text.startsWith('Тест-камера'));
camSel.value=custom.value;fire('cam','change');
console.log('res disabled',d.getElementById('res').disabled,'sw',d.getElementById('sw').value);
console.log('VERDICT cam:',T('verdict'));
const om=d.getElementById('om-1');const det=[...om.options].find(o=>o.text==='Детектор деталей');om.value=det.value;om.dispatchEvent(new w.Event('change',{bubbles:true}));
console.log('LEGEND det:',[...d.querySelectorAll('#legend li')].map(l=>l.textContent.replace(/\s+/g,' ').trim()).join(' || '));
console.log('SYS:',T('sysKpis'));
console.log('tips',d.querySelectorAll('.tipbtn').length);
// export → import
const assert=require('assert');let reloads=0;
const page=seed=>{const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(/navigation/.test(e.message))reloads++;else console.error(e)});
  return new JSDOM(fs.readFileSync(__dirname+'/../dist/camera-calc.html','utf8'),{runScripts:'dangerously',url:'https://x.test/',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};if(seed)w.localStorage.setItem('camcalc3',seed)}}).window};
let href='';w.HTMLAnchorElement.prototype.click=function(){href=this.href};
d.getElementById('expBtn').click();
assert.ok(href.startsWith('data:application/json'),'экспорт: не JSON');
const exp=decodeURIComponent(href.split(',').slice(1).join(',')),ex=JSON.parse(exp);
assert.deepStrictEqual([ex.cams.map(c=>c.name),ex.dets.map(x=>x.name)],[['Тест-камера 8 Мп'],['Детектор деталей']],'экспорт: нет своих шаблонов');
const before=w.localStorage.getItem('camcalc3');w.importText('{битый');
assert.strictEqual(T('toast'),'Файл не похож на сохранение калькулятора');
assert.strictEqual(w.localStorage.getItem('camcalc3'),before,'битый файл изменил данные');
['{"types":[null]}','{"types":[]}','{}',JSON.stringify({...ex,types:[{name:'Тип',objs:'x'}]}),JSON.stringify({types:ex.types})].forEach(s=>{
  d.getElementById('toast').textContent='';w.importText(s);
  assert.strictEqual(T('toast'),'Файл не похож на сохранение калькулятора',s);
  assert.strictEqual(w.localStorage.getItem('camcalc3'),before,'файл изменил данные: '+s)});
let picks=0;d.getElementById('impFile').click=()=>picks++;
d.getElementById('impBtn').click();
assert.strictEqual(T('impBtn'),'Заменит всё. Ещё раз');assert.strictEqual(picks,0,'выбор файла без подтверждения');
d.getElementById('impBtn').click();
assert.strictEqual(picks,1,'второе нажатие не открыло выбор файла');assert.strictEqual(T('impBtn'),'Импорт');
const w2=page();w2.importText(exp);assert.strictEqual(reloads,1,'импорт не перезагрузил страницу');
const w3=page(w2.localStorage.getItem('camcalc3')),T3=id=>w3.document.getElementById(id).textContent.replace(/\s+/g,' ').trim();
assert.ok([...w3.document.getElementById('cam').options].some(o=>o.text.startsWith('Тест-камера')),'после импорта нет своей камеры');
assert.strictEqual(T3('sysKpis'),T('sysKpis'),'после импорта другие итоги');
assert.strictEqual(w3.eval('report'),w.eval('report'),'после импорта другой отчёт');
console.log('export/import: ok');
// unreadable file
const inp=d.getElementById('impFile'),kept=w.localStorage.getItem('camcalc3');d.getElementById('toast').textContent='';
Object.defineProperty(inp,'files',{value:[{text:()=>Promise.reject(new Error('NotReadableError'))}]});
inp.dispatchEvent(new w.Event('change'));
setTimeout(()=>{assert.strictEqual(T('toast'),'Не удалось прочитать файл');assert.strictEqual(w.localStorage.getItem('camcalc3'),kept);console.log('unreadable file: ok')},0);
// invalid select values on load
const w4=page(JSON.stringify({...ex,gl:{...ex.gl,gcnt:'8',gpu:'nope'}}));
assert.deepStrictEqual([w4.document.getElementById('gcnt').value,w4.document.getElementById('gpu').value],['auto','auto'],'недопустимое значение списка после загрузки');
console.log('invalid select on load: ok');
// data changed in another tab
const w5=page(exp),d5=w5.document,other=JSON.stringify({...ex,types:[{...ex.types[0],name:'Из другой вкладки'}]});
w5.localStorage.setItem('camcalc3',other);w5.dispatchEvent(new w5.StorageEvent('storage',{key:'camcalc3'}));
d5.getElementById('kr').value='0.5';d5.getElementById('kr').dispatchEvent(new w5.Event('input',{bubbles:true}));
assert.strictEqual(w5.localStorage.getItem('camcalc3'),other,'вкладка затёрла данные другой вкладки');
assert.strictEqual(d5.getElementById('toast').textContent,'Данные изменены в другой вкладке. Обновите страницу');
console.log('stale tab: ok');
