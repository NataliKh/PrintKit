// Small static preview illustrations: no personal content, downloads or remote assets.
const galleryMiniatures={
  math:'<div class="mini-math"><i>7 + 4 = ____</i><i>12 − 5 = ____</i><i>9 + (3 − 2) = ____</i></div>',
  cards:'<div class="mini-cards"><i>cat</i><i>dog</i><i>sun</i><i>bird</i></div>',
  labels:'<div class="mini-labels"><i>Анна</i><i>Анна</i><i>Анна</i><i>Анна</i><i>Анна</i><i>Анна</i></div>',
  diploma:'<div class="mini-award"><span>★</span><strong>ГРАМОТА</strong><i>за достижения</i></div>',
  schedule:'<div class="mini-schedule"><span>ПН</span><span>ВТ</span><span>СР</span><i></i><i></i><i></i><i></i><i></i><i></i></div>',
  habits:'<div class="mini-habits"><span>○ ○ ○ ○ ○</span><span>○ ○ ● ○ ○</span><span>● ○ ○ ○ ●</span><span>○ ○ ○ ● ○</span></div>'
};
const galleryCategoryNames={all:"Все",math:"Математика",cards:"Карточки",labels:"Наклейки",diploma:"Грамоты",schedule:"Расписание",habits:"Привычки"};
const galleryTemplates=modes.flatMap(type=>starterKits[type].map((kit,index)=>({type,...kit,featured:index===0})));
let galleryCategory="all",galleryExpanded=false;
const gallerySearch=document.getElementById("catalog-search");
const galleryFilters=document.getElementById("catalog-filters");
const galleryGrid=document.getElementById("catalog-grid");
const galleryMore=document.getElementById("catalog-more");
const galleryCount=document.getElementById("catalog-count");
const galleryEmpty=document.getElementById("catalog-empty");
function galleryNormalize(value){return String(value).toLocaleLowerCase("ru").replace(/ё/g,"е").trim()}
function galleryCard(kit){
 return '<button type="button" class="catalog-card" data-template="'+esc(kit.id)+'" data-mode="'+esc(kit.type)+'" aria-label="Выбрать шаблон: '+esc(kit.title)+'">'+
  '<span class="catalog-thumbnail catalog-thumbnail--'+esc(kit.type)+'" aria-hidden="true">'+
   '<span class="catalog-sheet"><span class="catalog-sheet-title"></span>'+galleryMiniatures[kit.type]+'</span>'+
   '<img class="catalog-real-preview" src="./previews/'+esc(kit.type)+'-'+esc(kit.id)+'.jpg" alt="" loading="lazy" width="333" height="471">'+
   '<span class="catalog-a4">А4</span></span>'+
  '<span class="catalog-card-body"><span class="catalog-category">'+esc(galleryCategoryNames[kit.type])+'</span>'+
  '<span class="catalog-card-title">'+esc(kit.icon)+' '+esc(kit.title)+'</span>'+
  '<span class="catalog-card-description">'+esc(kit.description)+'</span>'+
  '<span class="catalog-card-link">Открыть шаблон <span aria-hidden="true">↗</span></span></span></button>';
}
function galleryInitFilters(){
 galleryFilters.innerHTML=Object.entries(galleryCategoryNames).map(([key,label])=>
  '<button type="button" data-category="'+key+'" aria-pressed="'+(galleryCategory===key)+'">'+esc(label)+'</button>'
 ).join("");
 galleryFilters.querySelectorAll("[data-category]").forEach(button=>button.onclick=()=>{
  galleryCategory=button.dataset.category;
  galleryExpanded=false;
  galleryRender();
 });
}
function galleryRender(){
 galleryFilters.querySelectorAll("[data-category]").forEach(button=>{
  button.setAttribute("aria-pressed",String(galleryCategory===button.dataset.category));
 });
 const query=galleryNormalize(gallerySearch.value);
 const matched=galleryTemplates.filter(kit=>{
  if(galleryCategory!=="all"&&kit.type!==galleryCategory)return false;
  const corpus=galleryNormalize([kit.title,kit.description,galleryCategoryNames[kit.type],Object.values(kit.values).join(" ")].join(" "));
  return corpus.includes(query);
 });
 const featuredOnly=galleryCategory==="all"&&!query&&!galleryExpanded;
 const shown=featuredOnly?matched.filter(kit=>kit.featured):matched;
 galleryGrid.innerHTML=shown.map(galleryCard).join("");
 galleryGrid.querySelectorAll("img.catalog-real-preview").forEach(img=>{
  img.addEventListener("error",()=>{img.hidden=true},{once:true});
 });
 galleryEmpty.hidden=matched.length>0;
 galleryMore.hidden=galleryCategory!=="all"||Boolean(query);
 galleryMore.setAttribute("aria-expanded",String(galleryExpanded));
 galleryMore.textContent=galleryExpanded?"Свернуть каталог ↑":"Показать все "+galleryTemplates.length+" шаблонов ↓";
 galleryCount.textContent=matched.length===0?"Ничего не найдено":
  "Показано "+shown.length+" из "+matched.length+" шаблонов";
 galleryGrid.querySelectorAll("[data-template]").forEach(button=>button.onclick=()=>{
  applyCatalogStarter(button.dataset.mode,button.dataset.template);
 });
}
galleryInitFilters();
gallerySearch.addEventListener("input",galleryRender);
galleryMore.addEventListener("click",()=>{
 galleryExpanded=!galleryExpanded;
 galleryRender();
});
galleryRender();
