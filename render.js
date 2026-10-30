function renderSheet(mode,get,e,lines,clamp){
const title=e(get("title"));
const page=(body,kind="")=>'<section class="sheet-page '+kind+'">'+body+'</section>';
const heading=(text,subtitle="")=>'<h2>'+text+'</h2>'+(subtitle?'<p class="sub">'+subtitle+'</p>':'');
const parts=[];
const layoutClass=(value,allowed)=>allowed[value]||allowed[Object.keys(allowed)[0]];
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
 const layout=layoutClass(get("layout"),{"Классический":"classic","Школьный":"school","Нежный":"soft"});
 const icon=layout==="school"?"✎":layout==="soft"?"✿":"✦";
 const items=Array.from({length:clamp(get("count"),27)},()=>'<article><span class="label-mark" aria-hidden="true">'+icon+'</span><b>'+e(get("name"))+'</b><small>'+e(get("subtitle"))+'</small></article>');
 for(let i=0;i<items.length;i+=12)parts.push(page(heading('Именные наклейки')+
  '<div class="labels labels--'+layout+'">'+items.slice(i,i+12).join("")+'</div>','labels-page'));
}
if(mode==="diploma"){
 const layout=layoutClass(get("layout"),{"Торжественный":"formal","Современный":"modern","Детский":"kids"});
 const medal=layout==="kids"?"★":layout==="modern"?"✧":"✦";
 parts.push(page('<div class="diploma diploma--'+layout+'"><div class="award-medal" aria-hidden="true">'+medal+'</div><p class="award-kicker">ВРУЧАЕТСЯ</p><h2>'+e(get("kind"))+'</h2><p>Награждается</p><b>'+e(get("name"))+'</b><p class="award-reason">'+e(get("reason"))+'</p><p class="issuer">'+e(get("issuer"))+'</p><small>Дата: ______________</small></div>','diploma-page'));
}
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
 const months=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
 const month=months.indexOf(get("month"));
 const yearValue=Number(get("year"));
 const year=Number.isInteger(yearValue)&&yearValue>=1900&&yearValue<=2100?yearValue:2026;
 const dated=month>=0;
 const n=dated?new Date(Date.UTC(year,month+1,0)).getUTCDate():clamp(get("days"),31);
 const habits=lines(get("items")).slice(0,15);
 const cols='<colgroup><col class="habit-name-col">'+Array.from({length:n},()=>'<col class="habit-day-col">').join("")+'</colgroup>';
 const weekend=i=>dated&&[0,6].includes(new Date(Date.UTC(year,month,i+1)).getUTCDay());
 const head='<thead><tr><th scope="col" class="habit-name-heading">Привычка</th>'+Array.from({length:n},(_,i)=>'<th scope="col" class="habit-day-heading'+(weekend(i)?' habit-weekend':'')+'">'+(i+1)+'</th>').join("")+'</tr></thead>';
 const row=x=>'<tr><th scope="row" class="habit-name">'+e(x)+'</th>'+Array.from({length:n},(_,i)=>'<td class="habit-day'+(weekend(i)?' habit-weekend':'')+'"><span class="habit-box" aria-hidden="true"></span></td>').join("")+'</tr>';
 const subtitle=dated?months[month]+' '+year:'Месяц: __________________';
 for(let i=0;i<Math.max(1,habits.length);i+=7)parts.push(page(heading(title,subtitle)+
  '<table class="habit" aria-label="Трекер привычек на '+n+' дней">'+cols+head+'<tbody>'+habits.slice(i,i+7).map(row).join("")+'</tbody></table>','habits-page'));
}
return parts.join("");
}
