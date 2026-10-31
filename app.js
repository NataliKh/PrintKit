const modes=["math","cards","labels","diploma","schedule","habits"];const names=["➕ Математика","🃏 Карточки","🏷️ Наклейки","🏆 Грамоты","📅 Расписание","✅ Привычки"];
const configs={math:[["grade","Класс","select","1 класс|2 класс|3 класс|4 класс|5 класс"],["topic","Тема","select","По программе класса|Сложение и вычитание|Переход через десяток|Пропущенное число|Таблица умножения|Деление без остатка|Умножение и деление|Порядок действий|Доли числа"],["count","Примеров","number","20"],["level","Сложение и вычитание: тип","select","Простые|Несколько действий|Со скобками"],["max","Максимальный результат","select","10|20|50|100|200"],["key","Лист с ответами","select","Нет|Да"]],cards:[["title","Название","text","Карточки"],["items","Термин — перевод, каждый с новой строки","textarea","cat — кошка\ndog — собака\nsun — солнце"]],labels:[["kit","Вариант набора","select","Одинаковые|Школьный комплект"],["audience","Для кого","select","Один ребёнок|Несколько детей"],["name","Имя","text","Анна Иванова"],["names","Имена детей (каждое с новой строки)","textarea",""],["subtitle","Подпись","text","Мои вещи"],["count","Количество","number","18"],["layout","Макет наклеек","select","Классический|Школьный|Нежный"],["size","Размер наклеек","select","Стандартные 54 × 38 мм|Маленькие 40 × 22 мм|Крупные 80 × 48 мм"],["subjects","Предметы и количество","subjects","[{\"name\":\"Математика\",\"selected\":true,\"qty\":2},{\"name\":\"Русский язык\",\"selected\":true,\"qty\":2},{\"name\":\"Литература\",\"selected\":true,\"qty\":1},{\"name\":\"Английский язык\",\"selected\":true,\"qty\":1},{\"name\":\"Окружающий мир\",\"selected\":true,\"qty\":1},{\"name\":\"История\",\"selected\":true,\"qty\":1},{\"name\":\"Биология\",\"selected\":false,\"qty\":1},{\"name\":\"География\",\"selected\":false,\"qty\":1},{\"name\":\"Тетрадь\",\"selected\":true,\"qty\":2},{\"name\":\"Черновик\",\"selected\":true,\"qty\":2}]"]],diploma:[["kind","Тип","select","Грамота|Диплом|Сертификат"],["name","Кому","text","Анна Иванова"],["reason","За что","textarea","За отличные успехи!"],["issuer","Кто награждает","text","Классный руководитель"],["layout","Макет грамоты","select","Торжественный|Современный|Детский"]],schedule:[["title","Заголовок","text","Моё расписание"],["items","Уроки через запятую, каждый день — новая строка","textarea","Математика, Русский\nЧтение, Музыка\nМатематика, Английский\nРусский, Физкультура\nЧтение, Математика"]],habits:[["title","Заголовок","text","Мои привычки"],["items","Привычки по строкам","textarea","Читать\nЗарядка\nПить воду"],["days","Дней (без календаря)","number","30"],["month","Месяц","select","Без календаря|Январь|Февраль|Март|Апрель|Май|Июнь|Июль|Август|Сентябрь|Октябрь|Ноябрь|Декабрь"],["year","Год","number","2026"]]};

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
 if(id==="names"){
  return '<label class="field family-names-field" data-field-id="names" for="f-names">'+esc(label)+
   '<textarea id="f-names" data-k="names" rows="3" maxlength="8000" spellcheck="false" placeholder="Анна Иванова&#10;Марк Иванов">'+esc(value)+'</textarea>'+
   '<span class="family-hint">До 6 детей. Предметы и размеры будут одинаковыми для каждого.</span>'+
   '<span id="family-summary" class="family-summary" aria-live="polite"></span></label>';
 }
 if(type==="subjects"){
  return '<section class="field school-picker" data-field-id="'+id+'" hidden>'+
   '<h4>'+esc(label)+'</h4><p class="school-picker-help">Отметьте предметы и укажите, сколько наклеек нужно для каждого.</p>'+
   '<input type="hidden" id="f-'+id+'" data-k="'+id+'" value="'+esc(value)+'">'+
   '<div id="school-subject-list" class="school-subject-list"></div>'+
   '<div class="school-add"><label for="school-new-name">Свой предмет</label><div class="school-add-actions">'+
   '<input id="school-new-name" type="text" maxlength="36" placeholder="Например, Информатика">'+
   '<button id="school-add-button" type="button">+ Добавить</button></div></div>'+
   '<p id="school-subject-count" class="school-subject-count" role="status" aria-live="polite"></p></section>';
 }
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
 return '<label class="field" data-field-id="'+id+'" for="f-'+id+'">'+esc(label)+input+'</label>';
}
function syncMathTopics(){
 const select=$("f-topic");
 if(mode!=="math"||!select)return;
 const options=mathTopicsByGrade[val("grade")]||mathTopicsByGrade["1 класс"];
 const preferred=select.value;
 select.innerHTML=options.map(topic=>'<option>'+esc(topic)+'</option>').join("");
 select.value=options.includes(preferred)?preferred:options[0];
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
 if(mode==="labels"){
  const multi=val("audience")==="Несколько детей";
  const rawNames=val("names").split(/\r?\n/).map(name=>name.replace(/\s+/g," ").trim()).filter(Boolean);
  if(multi&&!rawNames.length)issues.push("Добавьте хотя бы одно имя ребёнка.");
  if(multi&&rawNames.length>6)issues.push("Можно указать не более 6 детей.");
  if(multi&&rawNames.some(name=>name.length>48))issues.push("Сократите имя ребёнка до 48 символов.");
  const totalPerChild=val("kit")==="Школьный комплект"
   ?parseSchoolSubjects(val("subjects")).filter(row=>row.selected).reduce((sum,row)=>sum+row.qty,0)
   :Math.max(1,inputCount||1);
  const total=totalPerChild*(multi?rawNames.length:1);
  if(total>96)issues.push("Всего можно создать не более 96 наклеек. Уменьшите количество или число детей.");
 }

 if(mode==="labels"&&val("kit")==="Школьный комплект"){
  const chosen=parseSchoolSubjects(val("subjects")).filter(item=>item.selected);
  const total=chosen.reduce((sum,item)=>sum+item.qty,0);
  if(total===0)issues.push("Выберите хотя бы один предмет для школьного комплекта.");
  // Per-child quantities are checked against the shared 96-label limit above.
 }
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
 if(mode==="labels")updateFamilySummary();
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
function toggleLabelKit(){
 if(mode!=="labels")return;
 const school=val("kit")==="Школьный комплект";
 for(const key of ["subtitle","count"]){
  const field=document.querySelector('#fields [data-field-id="'+key+'"]');
  if(field)field.hidden=school;
 }
 const picker=document.querySelector('#fields [data-field-id="subjects"]');
 if(picker)picker.hidden=!school;
}
function toggleLabelAudience(){
 if(mode!=="labels")return;
 const multi=val("audience")==="Несколько детей";
 for(const key of ["name","names"]){
  const field=document.querySelector('#fields [data-field-id="'+key+'"]');
  if(field)field.hidden=key==="name"?multi:!multi;
 }
 updateFamilySummary();
}
function updateFamilySummary(){
 const summary=$("family-summary");
 if(!summary||mode!=="labels")return;
 const names=parseLabelNames(val("names"));
 const rawCount=val("names").split(/\r?\n/).map(name=>name.trim()).filter(Boolean).length;
 const selected=val("kit")==="Школьный комплект"
  ?parseSchoolSubjects(val("subjects")).filter(row=>row.selected).reduce((sum,row)=>sum+row.qty,0)
  :Math.max(1,Number(val("count"))||1);
 const total=rawCount*selected;
 const labelWord=total%10===1&&total%100!==11?"наклейка":
  total%10>=2&&total%10<=4&&(total%100<12||total%100>14)?"наклейки":"наклеек";
 summary.textContent=rawCount+" "+(rawCount===1?"ребёнок":rawCount<5?"ребёнка":"детей")+" · "+total+" "+labelWord;
 summary.classList.toggle("is-warning",rawCount===0||rawCount>6||total>96);
}
function renderSchoolPicker(){
 if(mode!=="labels")return;
 const holder=$("school-subject-list"),hidden=$("f-subjects");
 if(!holder||!hidden)return;
 const items=parseSchoolSubjects(hidden.value);
 holder.innerHTML=items.map((item,i)=>'<div class="school-subject-row" data-subject-index="'+i+'">'+
  '<label class="school-subject-name"><input class="school-subject-check" type="checkbox" '+(item.selected?'checked':'')+'>'+
  '<span>'+esc(item.name)+'</span></label>'+
  '<label class="school-subject-qty"><span class="sr-only">Количество наклеек: '+esc(item.name)+'</span>'+
  '<input type="number" min="1" max="24" inputmode="numeric" value="'+item.qty+'" '+(!item.selected?'disabled':'')+'></label>'+
  '<button type="button" class="school-subject-remove" aria-label="Убрать '+esc(item.name)+'" title="Убрать предмет">×</button></div>').join("");
 const updateTotal=()=>{
  const active=parseSchoolSubjects(hidden.value).filter(item=>item.selected);
  const total=active.reduce((sum,item)=>sum+item.qty,0);
  const message="Выбрано: "+total+" наклеек · "+active.length+" предметов";
  $("school-subject-count").textContent=total>96?message+". Максимум — 96.":message;
  $("school-subject-count").classList.toggle("is-warning",total>96||total===0);
 };
 const update=(i,fields)=>{
  const next=parseSchoolSubjects(hidden.value);
  if(!next[i])return;
  Object.assign(next[i],fields);
  hidden.value=JSON.stringify(next);
  chooseStarter(null);
  $("starter-status").textContent="";
  updateTotal();
  updateFamilySummary();
  generate();
 };
 holder.querySelectorAll(".school-subject-row").forEach(row=>{
  const i=Number(row.dataset.subjectIndex);
  const checkbox=row.querySelector(".school-subject-check");
  const qty=row.querySelector(".school-subject-qty input");
  checkbox.onchange=()=>{
   update(i,{selected:checkbox.checked});
   renderSchoolPicker();
  };
  qty.onchange=()=>{
   update(i,{qty:Math.min(24,Math.max(1,Math.floor(Number(qty.value)||1)))});
   renderSchoolPicker();
  };
  row.querySelector(".school-subject-remove").onclick=()=>{
   const next=parseSchoolSubjects(hidden.value);
   next.splice(i,1);
   hidden.value=JSON.stringify(next);
   chooseStarter(null);
   $("starter-status").textContent="";
   renderSchoolPicker();
   generate();
  };
 });
 const addName=$("school-new-name"),addButton=$("school-add-button");
 addButton.onclick=()=>{
  const name=addName.value.trim().replace(/\s+/g," ");
  const items=parseSchoolSubjects(hidden.value);
  if(!name||name.length>36){$("school-subject-count").textContent="Введите название предмета до 36 символов.";return}
  if(items.some(item=>item.name.toLocaleLowerCase("ru")===name.toLocaleLowerCase("ru"))){
   $("school-subject-count").textContent="Этот предмет уже есть в списке.";return;
  }
  if(items.length>=20){$("school-subject-count").textContent="Можно добавить не более 20 предметов.";return}
  items.push({name,selected:true,qty:1});
  hidden.value=JSON.stringify(items);
  addName.value="";
  chooseStarter(null);
  $("starter-status").textContent="";
  renderSchoolPicker();
  updateFamilySummary();
  generate();
  $("school-new-name").focus();
 };
 addName.onkeydown=event=>{if(event.key==="Enter"){event.preventDefault();addButton.click()}};
 updateTotal();
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
 if(mode==="labels"){renderSchoolPicker();toggleLabelKit();toggleLabelAudience();}
 if(mode==="math")syncMathTopics();
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
 if(mode==="labels"){renderSchoolPicker();toggleLabelKit();toggleLabelAudience();}
 if(mode==="math")syncMathTopics();
 document.querySelectorAll("[data-k]").forEach(el=>{
  el.onchange=()=>{
   clearTimeout(inputTimer);
   chooseStarter(null);
   $("starter-status").textContent="";
   if(mode==="math"&&el.dataset.k==="grade")syncMathTopics();
   if(mode==="labels"&&el.dataset.k==="kit"){
    if(el.value==="Школьный комплект"&&val("layout")==="Классический")$("f-layout").value="Школьный";
    toggleLabelKit();
   }
   if(mode==="labels"&&el.dataset.k==="audience"){
    if(el.value==="Несколько детей"&&!val("names").trim())$("f-names").value=val("name").trim();
    toggleLabelAudience();
   }
   if(mode==="labels")updateFamilySummary();
   generate();
  };
  if(el.tagName!=="SELECT")el.oninput=()=>{
   clearTimeout(inputTimer);
   chooseStarter(null);
   $("starter-status").textContent="";
   if(mode==="labels"&&el.dataset.k==="names")updateFamilySummary();
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
