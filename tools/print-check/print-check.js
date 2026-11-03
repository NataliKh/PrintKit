/* Calibration and real flashcards share render.js and identical A4 CSS geometry. */
const $=id=>document.getElementById(id);
const sizes={standard:['Стандартные · 8 на листе',8],large:['Крупные · 4 на листе',4],compact:['Компактные · 12 на листе',12]};
const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const lines=s=>String(s).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const clamp=(n,max)=>Math.max(1,Math.min(max,Number(n)||1));
function calibration(){
 const ticks=[0,25,50,75,100].map(n=>'<i class="calibration-tick" style="--tick:'+n+'%" aria-hidden="true"><span>'+n+'</span></i>').join('');
 return '<section class="sheet-page calibration-page"><h2>Калибровка печати А4</h2>'+
 '<p class="calibration-text">Проверьте масштаб 100% · Бумага 210 × 297 мм</p>'+
 '<p class="calibration-label">1. Контрольная линия — 100 мм</p><div class="calibration-ruler" role="img" aria-label="Линия 100 мм">'+ticks+'</div>'+
 '<p class="calibration-label">2. Контрольный квадрат — 50 × 50 мм</p><div class="calibration-square" role="img" aria-label="Квадрат 50 на 50 мм">50 × 50 мм</div>'+
 '<div class="calibration-corners"><span>Левое поле — 18 мм</span><span>Правое поле — 18 мм</span></div>'+
 '<p class="calibration-note">Если размеры отличаются: выключите «Подогнать», выберите «Фактический размер / 100%», бумагу А4 и отключите колонтитулы.</p></section>';
}
/* Four symmetric reference crosses are outside the 18mm content area,
   but safely inside the typical printable margin. On a backlit duplex
   sheet the crosses should meet after the selected edge flip. */
const targetMarkup='<div class="check-targets" aria-hidden="true">'+
 ['tl','tr','bl','br'].map(pos=>'<span class="check-target check-target--'+pos+'"></span>').join('')+'</div>';
function readMeasured(id){
 const input=$(id);
 if(!input||input.value.trim()===''||!input.checkValidity())return null;
 const value=Number(input.value);
 return Number.isFinite(value)?value:null;
}
function showMeasureResult(){
 const duplex=document.querySelector('[name="check-mode"]:checked').value==='duplex';
 const result=$('check-measure-result');
 if(duplex){
  const x=readMeasured('check-offset-x'),y=readMeasured('check-offset-y');
  if(x===null||y===null){result.textContent='Введите смещение между крестиками на лицевой и оборотной сторонах.';return;}
  const max=Math.max(x,y);
  result.textContent=max<=1?
   'По вашим замерам смещение до 1 мм. Проверьте каждую карточку перед тиражом.':
   'Смещение до '+max.toFixed(1).replace('.',',')+' мм. Проверьте переворот листа, масштаб и настройку совмещения сторон в драйвере принтера.';
 }else{
  const expected=[100,50,50];
  const measured=['check-ruler-measured','check-square-width','check-square-height'].map(readMeasured);
  if(measured.some(value=>value===null)){result.textContent='Введите результаты трёх измерений с бумажного листа.';return;}
  const max=Math.max(...measured.map((value,i)=>Math.abs(value-expected[i])));
  const error=max.toFixed(1).replace('.',',');
  result.textContent=max<=1?
   'Максимальное отклонение '+error+' мм. Масштаб близок к исходному; перед тиражом проверьте поля и обрезку.':
   'Максимальное отклонение '+error+' мм. Проверьте бумагу А4, масштаб 100% и выключите «Подогнать под страницу».';
 }
}
function update(){
 const duplex=document.querySelector('[name="check-mode"]:checked').value==='duplex';
 $('duplex-controls').hidden=!duplex;
 $('check-scale-fields').hidden=duplex;
 $('check-duplex-fields').hidden=!duplex;
 if(!duplex){
  $('paper').innerHTML=calibration();
  $('check-pages').textContent='1 лист А4';
  $('check-print').textContent='Распечатать контрольный лист ↗';
  $('check-status').textContent='Подготовлен один лист А4.';
  $('check-side-tip').textContent='Для калибровки используйте одностороннюю печать.';
  $('check-result-help').innerHTML='Линейка должна быть <strong>ровно 100 мм</strong>, а обе стороны квадрата — <strong>50 мм</strong>. Измерьте обычной линейкой.';
 }else{
  const [size,n]=sizes[$('check-size').value]||sizes.standard;
  const props={title:'Проверка совмещения',size,sides:'Двусторонняя',
   flip:$('check-flip').value==='short'?'По короткому краю':'По длинному краю',
   items:Array.from({length:n},(_,i)=>'ЛИЦО '+(i+1)+' — ОБОРОТ '+(i+1)).join('\n')};
  $('paper').innerHTML=renderSheet('cards',k=>props[k]||'',esc,lines,clamp);
  $('paper').querySelectorAll('.cards-page').forEach(sheet=>sheet.insertAdjacentHTML('beforeend',targetMarkup));
  $('check-pages').textContent='2 страницы А4';
  $('check-print').textContent='Распечатать лицевую и оборотную стороны ↗';
  $('check-status').textContent='Подготовлены 2 страницы: лицо → оборот. Включите двустороннюю печать.';
  $('check-side-tip').innerHTML='Включите двустороннюю печать с переворотом <strong>'+($('check-flip').value==='short'?'по короткому':'по длинному')+' краю</strong>.';
  $('check-result-help').innerHTML='На просвет номера <strong>ЛИЦО 1</strong> и <strong>ОБОРОТ 1</strong> должны совпасть в одной карточке. Четыре крестика в полях — контроль смещения сторон: наложите бумагу на источник света и измерьте расстояние между ними.';
 }
 showMeasureResult();
}
document.querySelectorAll('#check-ruler-measured,#check-square-width,#check-square-height,#check-offset-x,#check-offset-y').forEach(el=>el.addEventListener('input',showMeasureResult));
document.querySelectorAll('[name="check-mode"],#check-size,#check-flip').forEach(el=>el.addEventListener('change',update));
$('check-print').addEventListener('click',()=>window.print());
update();