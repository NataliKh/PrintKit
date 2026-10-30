function renderSheet(mode,get,e,lines,clamp){
const title=e(get("title"));let html="";
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
   }else if(level==="Несколько действий"){
    answer=a+b-c;text=a+" + "+b+" − "+c;
   }else{
    if(Math.random()<.5){answer=a+(b-c);text=a+" + ("+b+" − "+c+")"}
    else{answer=a-(b-c);text=a+" − ("+b+" − "+c+")"}
   }
   attempt++;
  }while((answer<0||answer>max)&&attempt<300);
  if(answer<0||answer>max){const a=random(0,max),b=random(0,max-a);text=a+" + "+b;answer=a+b}
  questions.push('<div>'+(i+1)+'. '+text+' = ______</div>');
  answers.push((i+1)+'. '+answer);
 }
 html='<h2>Математика · '+e(get("grade"))+'</h2><p class="sub">Имя: ____________________　Дата: ____________</p><div class="problems">'+questions.join("")+'</div>';
 if(get("key")==="Да")html+='<section class="answer-page"><h2>Ответы</h2><p class="sub">Математика · '+e(get("grade"))+'</p><div class="answer-grid">'+answers.map(x=>'<span>'+x+'</span>').join("")+'</div></section>';
}
if(mode==="cards")html='<h2>'+title+'</h2><div class="cards">'+lines(get("items")).slice(0,40).map(x=>{const p=x.split(/\s+[—–-]\s+/);return '<article><b>'+e(p[0])+'</b><small>'+e(p.slice(1).join(" — "))+'</small></article>'}).join("")+'</div>';
if(mode==="labels")html='<h2>Именные наклейки</h2><div class="labels">'+Array.from({length:clamp(get("count"),27)},()=>'<article><b>'+e(get("name"))+'</b><small>'+e(get("subtitle"))+'</small></article>').join("")+'</div>';
if(mode==="diploma")html='<div class="diploma"><div class="award-medal">✦</div><p class="award-kicker">ВРУЧАЕТСЯ</p><h2>'+e(get("kind"))+'</h2><p>Награждается</p><b>'+e(get("name"))+'</b><p>'+e(get("reason"))+'</p><p class="issuer">'+e(get("issuer"))+'</p><small>Дата: ______________</small></div>';
if(mode==="schedule"){
 const days=["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
 const data=lines(get("items")).slice(0,7).map(x=>x.split(",").map(y=>y.trim()));
 const n=Math.max(1,...data.map(x=>x.length));
 html='<h2>'+title+'</h2><table><tr><th>№</th>'+data.map((_,i)=>'<th>'+days[i]+'</th>').join("")+'</tr>'+Array.from({length:n},(_,i)=>'<tr><th>'+(i+1)+'</th>'+data.map(d=>'<td>'+e(d[i]||"")+'</td>').join("")+'</tr>').join("")+'</table>';
}
if(mode==="habits"){
 const n=clamp(get("days"),31);
 html='<h2>'+title+'</h2><p class="sub">Месяц: __________________</p><table class="habit"><tr><th>Привычка</th>'+Array.from({length:n},(_,i)=>'<th>'+(i+1)+'</th>').join("")+'</tr>'+lines(get("items")).slice(0,15).map(x=>'<tr><td>'+e(x)+'</td>'+Array.from({length:n},()=>'<td>□</td>').join("")+'</tr>').join("")+'</table>';
}
return html;
}
