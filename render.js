// The school kit shares one validated, local format between the editor and print renderer.
function parseSchoolSubjects(raw){
 try{
  if(typeof raw!=="string"||raw.length>8000)return [];
  const data=JSON.parse(raw);
  if(!Array.isArray(data))return [];
  return data.slice(0,20).filter(row=>row&&typeof row.name==="string").map(row=>({
   name:row.name.trim().replace(/\s+/g," ").slice(0,36),
   selected:row.selected===true,
   qty:Math.max(1,Math.min(24,Math.floor(Number(row.qty)||1)))
  })).filter(row=>row.name);
 }catch{return []}
}
// Keep the names input local; a shared selection of subjects is repeated for each child.
function parseLabelNames(raw){
 if(typeof raw!=="string")return [];
 return raw.split(/\r?\n/).map(name=>name.replace(/\s+/g," ").trim()).filter(Boolean).slice(0,6);
}

/** Original vector paths: digits and pre-writing exercises without font assets. */
const writingDigitPaths={
 "0":"M50 10 C31 10 21 26 21 50 C21 74 31 90 50 90 C69 90 79 74 79 50 C79 26 69 10 50 10 Z",
 "1":"M29 27 L50 11 L50 90 M28 90 H75",
 "2":"M22 30 C23 14 37 9 51 9 C71 9 80 22 77 37 C74 48 63 58 48 71 L23 90 H80",
 "3":"M23 18 C37 7 60 7 71 21 C83 36 66 50 49 50 C68 50 79 65 72 80 C65 94 39 96 21 83",
 "4":"M69 10 L20 65 H83 M69 10 V91",
 "5":"M78 11 H31 L26 49 C40 39 64 40 74 54 C91 78 67 100 43 91 C32 89 25 85 20 80",
 "6":"M68 13 C45 15 29 30 25 51 C20 70 27 88 48 91 C68 95 80 79 74 64 C69 47 45 44 32 57",
 "7":"M20 13 H82 L40 91",
 "8":"M49 50 C29 37 27 21 40 13 C55 4 75 13 72 29 C70 41 58 46 49 50 C34 56 22 69 30 83 C41 101 73 94 75 77 C77 63 60 55 49 50",
 "9":"M72 48 C61 59 44 60 34 51 C19 37 31 10 50 10 C77 10 82 41 74 64 C67 84 55 91 34 91"
};

/**
 * Original approximate Russian lowercase cursive contours (а, о, и, м).
 * Designed from foundational oval / hook stroke principles, not traced from
 * proprietary workbook pages. Requires independent teacher review before
 * describing these as certified school models.
 */
const writingLetterPaths={
 "а":"M56 23 C41 16 27 29 25 47 C22 63 31 78 45 78 C62 78 71 61 70 44 C69 28 63 23 56 23 M69 26 L65 70 C64 79 72 79 84 66",
 "о":"M56 23 C42 17 27 30 25 47 C23 65 32 78 46 78 C62 78 73 62 73 46 C73 30 63 23 56 23 Z M72 45 Q75 54 85 58",
 "и":"M22 25 L17 65 C15 81 28 82 38 69 C44 62 48 45 53 25 M53 25 L48 64 C46 80 61 83 71 69 L85 57",
 "м":"M11 73 Q23 65 34 34 L40 22 L32 67 C30 81 45 83 54 69 L72 22 L64 66 C62 80 75 82 87 67"
};

const writingElements=[
 {name:"Прямые линии",path:"M50 10 V90"},
 {name:"Наклонные линии",path:"M28 90 L72 10"},
 {name:"Крючки",path:"M35 10 V66 C35 96 70 95 73 70"},
 {name:"Дуги",path:"M20 86 C22 30 77 30 80 86"},
 {name:"Овалы",path:"M50 10 C31 10 21 26 21 50 C21 74 31 90 50 90 C69 90 79 74 79 50 C79 26 69 10 50 10 Z"},
 {name:"Волны",path:"M8 59 C22 24 35 24 48 59 C61 92 74 92 92 55"}
];
function writingExercises(get){
 const set=get("set"),times=get("rows")==="12"?12:6;
 if(set==="Первые письменные буквы"){
  return Object.entries(writingLetterPaths).flatMap(([letter,path])=>
   Array.from({length:3},()=>({name:"Строчная буква "+letter,path,kind:"letter"})));
 }
 if(set==="Одна письменная буква"){
  const letter=Object.hasOwn(writingLetterPaths,get("letter"))?get("letter"):"а";
  return Array.from({length:times},()=>({
   name:"Строчная буква "+letter,path:writingLetterPaths[letter],kind:"letter"
  }));
 }
 if(set==="Одна цифра"){
  const digit=Object.hasOwn(writingDigitPaths,get("digit"))?get("digit"):"0";
  return Array.from({length:times},()=>({name:"Цифра "+digit,path:writingDigitPaths[digit]}));
 }
 if(set==="Элементы письма"){
  const one=writingElements.find(item=>item.name===get("element"));
  return one?Array.from({length:times},()=>one):writingElements;
 }
 return Object.entries(writingDigitPaths).map(([digit,path])=>({name:"Цифра "+digit,path}));
}

function renderSheet(mode,get,e,lines,clamp,mathSnapshot=null){
const title=e(get("title"));
const page=(body,kind="")=>'<section class="sheet-page '+kind+'">'+body+'</section>';
const heading=(text,subtitle="")=>'<h2>'+text+'</h2>'+(subtitle?'<p class="sub">'+subtitle+'</p>':'');
const parts=[];
const layoutClass=(value,allowed)=>allowed[value]||allowed[Object.keys(allowed)[0]];
if(mode==="math"){
 const grade=e(get("grade"));
 const generated=mathSnapshot||mathGenerate(get("grade"),get("topic"),get("level"),get("max"),clamp(get("count"),40));
 const density=layoutClass(get("density"),{"Стандартный":"standard","Крупный":"large","Компактный":"compact"});
 const isWord=generated.topic==='Текстовые задачи'&&generated.questions.every(q=>q.kind==='word');
 // Keep the writing line with the arithmetic expression. Use a full-width
 // page for long examples rather than wrapping the line in a narrow column.
 const needsWide=!isWord&&density!=="large"&&generated.questions.some(q=>{
  const written=q.blank?q.text.replace('□','________'):q.text+' = ________';
  return written.length>(density==="compact"?27:22);
 });
 const perPage=isWord?{large:4,standard:6,compact:8}[density]:
  density==="large"?12:needsWide?(density==="compact"?20:16):
  density==="compact"?30:20;
 const answerLine='<span class="math-answer-line" role="img" aria-label="Место для ответа"></span>';
 const signLine='<span class="math-answer-line" role="img" aria-label="Место для знака сравнения"></span>';
 const questions=generated.questions.map((q,i)=>q.kind==='word'?
  '<article class="math-word-question"><p class="math-word-text"><strong>'+(i+1)+'.</strong> '+e(q.text)+'</p>'+
  '<div class="math-word-solution"><span>Решение:</span><span class="math-word-solution-line" aria-hidden="true"></span></div>'+
  '<div class="math-word-response">Ответ: '+answerLine+'</div></article>':
  '<div'+(q.kind==='comparison'?' class="math-comparison"':'')+'>'+(i+1)+'. '+
  (q.blank?e(q.text).replace('□',q.kind==='comparison'?signLine:answerLine):
   e(q.text)+' = '+answerLine)+'</div>');
 const answers=generated.questions.map((q,i)=>'<span>'+(i+1)+'. '+
  (q.kind==='word'?e(q.solution)+' ('+e(q.unit)+')':e(q.answer))+'</span>');
 for(let i=0;i<questions.length;i+=perPage){
  parts.push(page(heading('Математика · '+grade,
   'Тема: '+e(generated.topic)+' · Имя: ____________________　Дата: ____________')+
   '<div class="'+(isWord?'math-word-problems':'problems')+'">'+questions.slice(i,i+perPage).join("")+'</div>',
   'math-page math-page--'+density+(isWord?' math-word-page':needsWide?' math-page--wide':'')));
 }
 if(get("key")==="Да"){
  for(let i=0;i<answers.length;i+=40)parts.push(page(heading('Ответы','Математика · '+grade)+
   '<div class="answer-grid'+(isWord?' math-word-answer-grid':'')+'">'+answers.slice(i,i+40).join("")+'</div>','answers-page'));
 }
}
if(mode==="writing"){
 const items=writingExercises(get);
 const isLetters=items.some(item=>item.kind==="letter");
 const group=isLetters?"Письменные буквы":
  get("set")==="Элементы письма"?"Элементы письма":"Цифры";
 const cell=(item,variant)=>{
  const visual=variant==="blank"?"":'<svg class="writing-trace-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+
   '<path d="'+item.path+'" class="writing-stroke writing-stroke--'+variant+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<div class="writing-cell writing-cell--'+variant+'" aria-label="'+
   (variant==="sample"?"Образец":variant==="trace"?"Обведите пунктир":"Напишите самостоятельно")+'">'+visual+'</div>';
 };
 for(let i=0;i<items.length;i+=6){
  const rows=items.slice(i,i+6).map((item,j)=>
   '<div class="writing-row"><div class="writing-row-caption"><span class="writing-row-number">'+(i+j+1)+'.</span> '+e(item.name)+'</div>'+
   '<div class="writing-cells">'+['sample','trace','trace','trace','blank','blank'].map(v=>cell(item,v)).join("")+'</div></div>');
  parts.push(page(heading('Прописи · '+e(group),
   (isLetters?'Строчные а, о, и, м · ':'')+
   'Обведи по образцу и попробуй самостоятельно · Имя: ____________________')+
   '<div class="writing-list">'+rows.join("")+'</div>'+
   '<p class="writing-footer">✦ Отличная работа! Продолжай тренироваться.</p>',
   'writing-page'+(isLetters?' writing-letter-page':'')));
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
 const size=layoutClass(get("size"),{"Стандартные 54 × 38 мм":"standard","Маленькие 40 × 22 мм":"small","Крупные 80 × 48 мм":"large"});
 const perPage={standard:12,small:32,large:8}[size];
 const icon=layout==="soft"?"✿":"✦";
 const mark=layout==="school"?"":'<span class="label-mark" aria-hidden="true">'+icon+'</span>';
 const schoolKit=get("kit")==="Школьный комплект";
 const subjects=schoolKit?parseSchoolSubjects(get("subjects")).filter(row=>row.selected):[];
 const multi=get("audience")==="Несколько детей";
 const people=multi?parseLabelNames(get("names")):[get("name")];
 const items=people.flatMap(person=>{
  const labels=schoolKit?subjects.flatMap(row=>Array.from({length:row.qty},()=>row.name)):
   Array.from({length:clamp(get("count"),96)},()=>get("subtitle"));
  return labels.map(caption=>'<article>'+mark+'<b>'+e(person)+'</b><small>'+e(caption)+'</small></article>');
 }).slice(0,96);
 for(let i=0;i<Math.max(1,items.length);i+=perPage)parts.push(page(heading(schoolKit?'Школьный комплект наклеек':'Именные наклейки')+
  '<div class="labels labels--'+layout+' labels--size-'+size+'">'+items.slice(i,i+perPage).join("")+'</div>','labels-page'));
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
