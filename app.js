const modes=["math","cards","labels","diploma","schedule","habits"];const names=["➕ Математика","🃏 Карточки","🏷️ Наклейки","🏆 Грамоты","📅 Расписание","✅ Привычки"];
const configs={math:[["grade","Класс","select","1 класс|2 класс|3 класс|4 класс|5 класс"],["count","Примеров","number","20"],["level","Сложность","select","Простые|Несколько действий|Со скобками"],["max","Максимальный результат","select","10|20|50|100|200"],["key","Лист с ответами","select","Нет|Да"]],cards:[["title","Название","text","Карточки"],["items","Термин — перевод, каждый с новой строки","textarea","cat — кошка\ndog — собака\nsun — солнце"]],labels:[["name","Имя","text","Анна Иванова"],["subtitle","Подпись","text","Мои вещи"],["count","Количество","number","18"],["layout","Макет наклеек","select","Классический|Школьный|Нежный"],["size","Размер наклеек","select","Стандартные 54 × 38 мм|Маленькие 40 × 22 мм|Крупные 80 × 48 мм"]],diploma:[["kind","Тип","select","Грамота|Диплом|Сертификат"],["name","Кому","text","Анна Иванова"],["reason","За что","textarea","За отличные успехи!"],["issuer","Кто награждает","text","Классный руководитель"],["layout","Макет грамоты","select","Торжественный|Современный|Детский"]],schedule:[["title","Заголовок","text","Моё расписание"],["items","Уроки через запятую, каждый день — новая строка","textarea","Математика, Русский\nЧтение, Музыка\nМатематика, Английский\nРусский, Физкультура\nЧтение, Математика"]],habits:[["title","Заголовок","text","Мои привычки"],["items","Привычки по строкам","textarea","Читать\nЗарядка\nПить воду"],["days","Дней (без календаря)","number","30"],["month","Месяц","select","Без календаря|Январь|Февраль|Март|Апрель|Май|Июнь|Июль|Август|Сентябрь|Октябрь|Ноябрь|Декабрь"],["year","Год","number","2026"]]};

const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));
const lines=value=>String(value).split(/\r?\n/).map(text=>text.trim()).filter(Boolean);
const clamp=(value,max)=>Math.max(1,Math.min(max,Number(value)||1));
let mode="math",data={},inputTimer=0,statusFrame=0;
try {
 data=JSON.parse(localStorage.getItem("printkit")||"{}");
 if(!data||typeof data!=="object"||Array.isArray(data))data={};
 mode=modes.includes(data.mode)?data.mode:"math";
}catch{data={}}

function val(key){return $("f-"+key)?.value||""}
function save(){
 data[mode]??={};
 document.querySelectorAll("[data-k]").forEach(el=>data[mode][el.dataset.k]=el.value);
 data.mode=mode;
 try{localStorage.setItem("printkit",JSON.stringify(data))}catch{}
}
function field([id,label,type,defaults]){
 const value=data[mode]?.[id]??defaults.split("|")[0];
 let input;
 if(type==="select"){
  input='<select id="f-'+id+'" data-k="'+id+'">'+defaults.split("|").map(x=>'<option '+(x===value?"selected":"")+'>'+esc(x)+'</option>').join("")+'</select>';
 }else if(type==="textarea"){
  input='<textarea id="f-'+id+'" data-k="'+id+'">'+esc(value)+'</textarea>';
 }else{
  const max=id==="count"?(mode==="math"?40:96):id==="days"?31:null;
  const attrs=type==="number"?' min="1"'+(max?' max="'+max+'"':''):'';
  input='<input id="f-'+id+'" data-k="'+id+'" type="'+type+'"'+attrs+' value="'+esc(value)+'">';
 }
 return '<label class="field" for="f-'+id+'">'+esc(label)+input+'</label>';
}
function fit(){
 const paper=$("paper"),box=paper.parentElement;
 paper.style.transform="";
 box.style.height="";
 paper.style.transformOrigin="top center";
 if(box.clientWidth<paper.offsetWidth+20){
  const scale=Math.min(1,(box.clientWidth-20)/paper.offsetWidth);
  paper.style.transform="scale("+scale+")";
  box.style.height=(paper.offsetHeight*scale+20)+"px";
 }
}
function pageWord(n){
 if(n%10===1&&n%100!==11)return "страница";
 if(n%10>=2&&n%10<=4&&(n%100<12||n%100>14))return "страницы";
 return "страниц";
}
function printIssues(){
 const issues=[];
 const inputCount=Number(val("count"));
 if(mode==="math"&&inputCount>40)issues.push("За один раз можно создать до 40 примеров. Уменьшите количество.");
 if(mode==="labels"&&inputCount>96)issues.push("За один раз можно создать до 96 наклеек. Уменьшите количество.");
 if(mode==="cards"&&lines(val("items")).length>40)issues.push("Можно распечатать до 40 карточек. Уберите лишние строки.");
 if(mode==="habits"&&lines(val("items")).length>15)issues.push("Трекер рассчитан на 15 привычек. Уберите лишние строки.");
 if(mode==="schedule"&&lines(val("items")).length>7)issues.push("В расписании можно указать до семи дней.");
 if(mode==="habits"&&val("month")==="Без календаря"&&Number(val("days"))>31)issues.push("В трекере без календаря можно указать до 31 дня.");
 const documentPages=document.querySelectorAll("#paper .sheet-page");
 const clipped=[...documentPages,...document.querySelectorAll("#paper .cards article, #paper .labels article, #paper .diploma")]
  .some(el=>el.scrollWidth>el.clientWidth+3||el.scrollHeight>el.clientHeight+3);
 if(clipped)issues.push("Часть текста не помещается на листе. Сократите текст или выберите более крупный шаблон.");
 return issues;
}
function updatePrintStatus(){
 const status=$("print-status"),print=$("print");
 const issues=printIssues();
 print.disabled=issues.length>0;
 status.classList.toggle("is-warning",issues.length>0);
 status.textContent=issues.length?issues.join(" "):"✓ Лист готов к печати. Весь материал помещается на А4.";
}
function generate(){
 save();
 const paper=$("paper");
 paper.dataset.theme=({Мятный:"mint",Персиковый:"peach",Минимализм:"minimal"})[val("theme")]||"lavender";
 paper.innerHTML=renderSheet(mode,val,esc,lines,clamp);
 const count=paper.querySelectorAll(".sheet-page").length;
 $("page-count").textContent=count+" "+pageWord(count)+" · А4";
 fit();
 cancelAnimationFrame(statusFrame);
 statusFrame=requestAnimationFrame(updatePrintStatus);
}
for(const name of ["cards","labels","diploma","schedule","habits"]){
 configs[name].unshift(["theme","Стиль оформления","select","Лавандовый|Мятный|Персиковый|Минимализм"]);
}
function chooseStarter(selectedId){
 document.querySelectorAll("#starter-grid [data-starter]").forEach(button=>{
  button.setAttribute("aria-pressed",String(button.dataset.starter===selectedId));
 });
}
function useStarter(id){
 const kit=starterKits[mode].find(item=>item.id===id);
 if(!kit)return;
 clearTimeout(inputTimer);
 // Only modify fields supplied by the kit: names and signatories remain personal.
 Object.entries(kit.values).forEach(([key,value])=>{
  const control=$("f-"+key);
  if(control)control.value=String(value);
 });
 chooseStarter(kit.id);
 $("starter-status").textContent="Готово: «"+kit.title+"». Можно изменить параметры ниже.";
 generate();
}
function applyCatalogStarter(nextMode,id){
 if(!modes.includes(nextMode)||!starterKits[nextMode]?.some(kit=>kit.id===id))return;
 clearTimeout(inputTimer);
 save();
 mode=nextMode;
 render();
 useStarter(id);
 navigateTo("editor-controls");
 $("title").focus({preventScroll:true});
}
function renderStarters(){
 const items=starterKits[mode]||[];
 $("starter-grid").innerHTML=items.map(item=>
  '<button type="button" class="starter-card" data-starter="'+esc(item.id)+'" aria-pressed="false">'+
  '<span class="starter-icon" aria-hidden="true">'+esc(item.icon)+'</span>'+
  '<span class="starter-card-title">'+esc(item.title)+'</span>'+
  '<span class="starter-card-description">'+esc(item.description)+'</span></button>'
 ).join("");
 $("starter-status").textContent="";
 document.querySelectorAll("#starter-grid [data-starter]").forEach(button=>{
  button.onclick=()=>useStarter(button.dataset.starter);
 });
}
function navigateTo(id){
 const target=$(id);
 if(!target)return;
 target.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
function savedStorage(){
 try{return window.localStorage}catch{return null}
}
function savedItems(){
 return savedKitStore.read(savedStorage(),modes,configs);
}
function savedMessage(text,isError=false){
 const status=$("saved-status");
 status.textContent=text;
 status.classList.toggle("is-error",isError);
}
function renderSavedSets(){
 const items=savedItems();
 $("saved-count").textContent=String(items.length);
 $("saved-count").hidden=items.length===0;
 $("saved-hint").textContent=items.length
  ? "Сохранено: "+items.length+" из "+savedKitStore.LIMIT
  : "Сохранить текущие настройки";
 $("saved-list").innerHTML=items.length?items.map(item=>{
  const toolName=names[modes.indexOf(item.mode)];
  return '<article class="saved-item"><span class="saved-item-info"><strong>'+esc(item.name)+'</strong>'+
   '<small>'+esc(toolName)+'</small></span><span class="saved-item-actions">'+
   '<button type="button" class="saved-open" data-saved-open="'+esc(item.id)+'">Открыть</button>'+
   '<button type="button" class="saved-remove" data-saved-remove="'+esc(item.id)+'" aria-label="Удалить набор '+esc(item.name)+'">×</button>'+
   '</span></article>';
 }).join(""):'<p class="saved-empty">Пока нет сохранённых наборов.</p>';
 $("saved-list").querySelectorAll("[data-saved-open]").forEach(button=>{
  button.onclick=()=>openSavedSet(button.dataset.savedOpen);
 });
 $("saved-list").querySelectorAll("[data-saved-remove]").forEach(button=>{
  button.onclick=()=>deleteSavedSet(button.dataset.savedRemove);
 });
}
function saveCurrentSet(){
 clearTimeout(inputTimer);
 save();
 const values=Object.fromEntries([...document.querySelectorAll("[data-k]")].map(el=>[el.dataset.k,el.value]));
 const result=savedKitStore.add(savedStorage(),modes,configs,mode,$("saved-name").value,values);
 if(!result.ok){
  const messages={
   name:"Введите название длиной от 1 до 48 символов.",
   values:"Не удалось сохранить данные: проверьте слишком длинные поля.",
   limit:"Достигнут лимит в 12 наборов. Удалите ненужный, чтобы сохранить новый.",
   storage:"Не удалось сохранить в браузере. Проверьте свободное место и настройки хранения."
  };
  savedMessage(messages[result.code]||"Не удалось сохранить набор.",true);
  return;
 }
 $("saved-name").value="";
 renderSavedSets();
 savedMessage("Набор «"+result.entry.name+"» сохранён на этом устройстве.");
}
function openSavedSet(id){
 const entry=savedItems().find(item=>item.id===id);
 if(!entry)return;
 clearTimeout(inputTimer);
 save();
 mode=entry.mode;
 data[mode]={...entry.values};
 render();
 savedMessage("Открыт набор «"+entry.name+"». Можно изменить или распечатать.");
 $("saved-section").open=true;
 $("title").focus({preventScroll:true});
}
function deleteSavedSet(id){
 const entry=savedItems().find(item=>item.id===id);
 if(!entry)return;
 if(!window.confirm("Удалить набор «"+entry.name+"»? Это действие нельзя отменить."))return;
 const result=savedKitStore.remove(savedStorage(),modes,configs,id);
 if(!result.ok){
  savedMessage("Не удалось удалить набор. Проверьте настройки хранения браузера.",true);
  return;
 }
 renderSavedSets();
 savedMessage("Набор «"+entry.name+"» удалён.");
}
function render(){
 clearTimeout(inputTimer);
 $("tabs").innerHTML=modes.map((name,i)=>'<button aria-current="'+(name===mode)+'" data-tab="'+name+'">'+names[i]+'</button>').join("");
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.onclick=()=>{
  clearTimeout(inputTimer);
  save();
  mode=btn.dataset.tab;
  render();
 });
 $("title").textContent=names[modes.indexOf(mode)];
 $("regenerate").textContent=mode==="math"?"↻ Новые примеры":"↻ Обновить лист";
 renderStarters();
 renderSavedSets();
 $("fields").innerHTML=configs[mode].map(field).join("");
 document.querySelectorAll("[data-k]").forEach(el=>{
  el.onchange=()=>{clearTimeout(inputTimer);chooseStarter(null);$("starter-status").textContent="";generate()};
  if(el.tagName!=="SELECT")el.oninput=()=>{
   clearTimeout(inputTimer);
   chooseStarter(null);
   $("starter-status").textContent="";
   inputTimer=setTimeout(generate,240);
  };
 });
 generate();
}
$("saved-save").onclick=saveCurrentSet;
$("saved-name").onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();saveCurrentSet()}};
$("regenerate").onclick=()=>{clearTimeout(inputTimer);chooseStarter(null);generate()};
$("reset").onclick=()=>{
 clearTimeout(inputTimer);
 delete data[mode];
 render();
};
$("print").onclick=()=>{
 clearTimeout(inputTimer);
 save();
 const issues=printIssues();
 if(issues.length){
  updatePrintStatus();
  $("print-status").focus();
  return;
 }
 window.print();
};
$("nav-settings").onclick=()=>navigateTo("editor-controls");
$("nav-preview").onclick=()=>navigateTo("print-preview");
onresize=()=>{fit();cancelAnimationFrame(statusFrame);statusFrame=requestAnimationFrame(updatePrintStatus)};
render();
// Intentional deep links from the public generator guides.
const launchParams=new URLSearchParams(window.location.search);
const launchMode=launchParams.get("tool");
const launchKit=launchParams.get("kit");
if(modes.includes(launchMode)){
 if(launchKit&&starterKits[launchMode]?.some(kit=>kit.id===launchKit)){
  applyCatalogStarter(launchMode,launchKit);
 }else if(mode!==launchMode){
  save();
  mode=launchMode;
  render();
 }
}
