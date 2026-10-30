function renderSheet(mode,get,e,lines,clamp){
const title=e(get("title"));
const page=(body,kind="")=>'<section class="sheet-page '+kind+'">'+body+'</section>';
const heading=(text,subtitle="")=>'<h2>'+text+'</h2>'+(subtitle?'<p class="sub">'+subtitle+'</p>':'');
const parts=[];
if(mode==="math"){
 const max=Math.max(2,Math.min(200,Number(get("max"))||20)),total=clamp(get("count"),40),level=get("level");
 const random=(lo,hi)=>lo+Math.floor(Math.random()*(hi-lo+1));
 const questions=[],answers=[];
 for(let i=0;i<total;i++){
  let text="",answer=0,attempt=0;
  do{
   const a=random(0,max),b=random(0,max),c=random(0,max);
   if(level==="Простые"){
    if(Math.random()<.5){answer=a+b;text=a+" + "+b}
    else{answer=a-b;text=a+" − "+b}
   }else if(level==="Несколько действий"){answer=a+b-c;text=a+" + "+b+" − "+c}
   else if(Math.random()<.5){answer=a+(b-c);text=a+" + ("+b+" − "+c+")"}
   else{answer=a-(b-c);text=a+" − ("+b+" − "+c+")"}
   attempt++;
  }while((answer<0||answer>max)&&attempt<300);
  if(answer<0||answer>max){const a=random(0,max),b=random(0,max-a);text=a+" + "+b;answer=a+b}
  questions.push('<div>'+(i+1)+'. '+text+' = ______</div>');
  answers.push('<span>'+(i+1)+'. '+answer+'</span>');
 }
 const grade=e(get("grade"));
 const perPage=20;
 for(let i=0;i<questions.length;i+=perPage){
  parts.push(page(heading('Математика · '+grade,'Имя: ____________________　Дата: ____________')+
   '<div class="problems">'+questions.slice(i,i+perPage).join("")+'</div>','math-page'));
 }
 if(get("key")==="Да"){
  for(let i=0;i<answers.length;i+=40)parts.push(page(heading('Ответы','Математика · '+grade)+
   '<div class="answer-grid">'+answers.slice(i,i+40).join("")+'</div>','answers-page'));
 }
}
if(mode==="cards"){
 const items=lines(get("items")).slice(0,40);
 const cards=items.map(x=>{const p=x.split(/\s+[—–-]\s+/);return '<article><b>'+e(p[0])+'</b><small>'+e(p.slice(1).join(" — "))+'</small></article>'});
 for(let i=0;i<Math.max(1,cards.length);i+=8)parts.push(page(heading(title)+
  '<div class="cards">'+cards.slice(i,i+8).join("")+'</div>','cards-page'));
}
if(mode==="labels"){
 const items=Array.from({length:clamp(get("count"),27)},()=>'<article><b>'+e(get("name"))+'</b><small>'+e(get("subtitle"))+'</small></article>');
 for(let i=0;i<items.length;i+=12)parts.push(page(heading('Именные наклейки')+
  '<div class="labels">'+items.slice(i,i+12).join("")+'</div>','labels-page'));
}
if(mode==="diploma")parts.push(page('<div class="diploma"><div class="award-medal">✦</div><p class="award-kicker">ВРУЧАЕТСЯ</p><h2>'+e(get("kind"))+'</h2><p>Награждается</p><b>'+e(get("name"))+'</b><p>'+e(get("reason"))+'</p><p class="issuer">'+e(get("issuer"))+'</p><small>Дата: ______________</small></div>','diploma-page'));
if(mode==="schedule"){
 const days=["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
 const data=lines(get("items")).slice(0,7).map(x=>x.split(",").map(y=>y.trim()));
 const n=Math.max(1,...data.map(x=>x.length));
 const head='<thead><tr><th scope="col">№</th>'+data.map((_,i)=>'<th scope="col">'+days[i]+'</th>').join("")+'</tr></thead>';
 const limit=8;
 for(let i=0;i<n;i+=limit)parts.push(page(heading(title)+
  '<table class="schedule-table">'+head+'<tbody>'+Array.from({length:Math.min(limit,n-i)},(_,j)=>{
   const index=i+j;return '<tr><th scope="row">'+(index+1)+'</th>'+data.map(d=>'<td>'+e(d[index]||"")+'</td>').join("")+'</tr>';
  }).join("")+'</tbody></table>','schedule-page'));
}
if(mode==="habits"){
 const n=clamp(get("days"),31),habits=lines(get("items")).slice(0,15);
 const cols='<colgroup><col class="habit-name-col">'+Array.from({length:n},()=>'<col class="habit-day-col">').join("")+'</colgroup>';
 const head='<thead><tr><th scope="col" class="habit-name-heading">Привычка</th>'+Array.from({length:n},(_,i)=>'<th scope="col" class="habit-day-heading">'+(i+1)+'</th>').join("")+'</tr></thead>';
 const row=x=>'<tr><th scope="row" class="habit-name">'+e(x)+'</th>'+Array.from({length:n},()=>'<td class="habit-day"><span class="habit-box" aria-hidden="true"></span></td>').join("")+'</tr>';
 for(let i=0;i<Math.max(1,habits.length);i+=7)parts.push(page(heading(title,'Месяц: __________________')+
  '<table class="habit" aria-label="Трекер привычек на '+n+' дней">'+cols+head+'<tbody>'+habits.slice(i,i+7).map(row).join("")+'</tbody></table>','habits-page'));
}
return parts.join("");
}
