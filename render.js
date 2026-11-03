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
 * Original approximate Russian lowercase cursive contours (а, о, и, м, с, е, л, н).
 * Designed from foundational oval / hook stroke principles, not traced from
 * proprietary workbook pages. Lowercase л has a clear single upper peak, и
 * uses a continuous two-hook stroke, and н has a distinct raised bridge.
 * Requires independent teacher review before
 * describing these as certified school models.
 */
const writingAlphabet="абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const writingLetterPaths={
 "а":"M55 23 C41 18 27 30 25 47 C21 65 33 79 46 78 C63 77 72 60 70 43 C68 27 61 22 55 23 M69 26 L65 68 C64 79 73 81 85 67",
 "б":"M80 10 C67 19 40 15 32 33 C23 47 26 63 35 72 C49 85 72 72 68 56 C63 40 40 44 30 55 M69 58 Q74 68 84 65",
 "в":"M35 18 C29 32 26 52 24 69 C23 82 30 83 39 74 C52 61 66 52 60 38 C55 28 45 37 34 49 C49 28 65 25 72 38 C79 51 65 67 42 76 Q63 89 84 67",
 "г":"M20 68 Q30 73 38 57 L48 29 Q50 24 55 30 Q65 39 76 28 M51 31 L44 70 Q44 81 60 77 Q71 72 82 65",
 "д":"M60 23 C47 17 30 31 26 48 C21 66 32 78 46 75 C62 73 68 51 69 27 L64 71 C61 91 47 99 34 93 C22 87 32 76 48 77 M68 68 Q74 75 86 62",
 "е":"M25 56 C49 58 73 45 71 32 C69 20 51 22 39 32 C25 45 24 65 37 74 C52 84 70 76 82 63",
 "ё":"M25 56 C49 58 73 45 71 32 C69 20 51 22 39 32 C25 45 24 65 37 74 C52 84 70 76 82 63 M39 12 l1 -1 M61 12 l1 -1",
 "ж":"M10 35 Q27 20 36 38 C45 54 31 67 17 78 M39 72 C43 53 49 32 55 22 M55 22 L50 70 M54 48 C67 31 73 30 78 36 C86 45 73 65 62 75 M80 69 Q85 76 91 68",
 "з":"M24 32 C39 19 62 22 69 35 C75 48 58 56 42 57 C61 55 75 67 67 83 C60 98 38 96 24 85",
 "и":"M23 20 L17 68 C15 81 28 83 37 72 L53 20 L47 69 C45 82 59 84 69 72 L81 61",
 "й":"M23 24 L17 68 C15 81 28 83 37 72 L53 24 L47 69 C45 82 59 84 69 72 L81 61 M38 10 Q50 20 63 9",
 "к":"M32 22 L23 69 C21 81 32 81 41 70 L49 55 C62 39 76 32 75 24 C73 19 61 23 51 39 L42 55 M48 54 C57 53 65 69 75 74 Q83 77 88 65",
 "л":"M16 70 C16 80 23 84 31 74 C41 60 44 36 54 21 C56 19 59 22 58 26 L49 68 C46 81 60 85 72 70 L85 60",
 "м":"M11 73 Q23 65 34 34 L40 22 L32 67 C30 81 45 83 54 69 L72 22 L64 66 C62 80 75 82 87 67",
 "н":"M23 20 L17 69 C16 78 29 83 36 70 L42 53 C48 47 59 47 67 53 L74 20 L66 69 C64 81 76 83 85 70",
 "о":"M56 23 C42 17 27 30 25 47 C23 65 32 78 46 78 C62 78 73 62 73 46 C73 30 63 23 56 23 Z M72 45 Q75 54 85 58",
 "п":"M20 20 L16 69 C14 79 26 82 36 72 L53 28 Q57 21 63 26 L57 68 C55 82 69 83 81 65",
 "р":"M37 22 L19 95 M31 48 C42 31 62 20 72 31 C86 48 71 75 51 78 Q38 78 27 66 M70 68 Q78 78 87 66",
 "с":"M77 33 C68 20 48 21 35 36 C22 49 24 66 36 75 C48 84 66 76 82 62",
 "т":"M12 23 L8 71 Q7 82 19 77 L35 31 C39 21 46 20 45 31 L37 69 Q34 82 48 77 L66 30 C69 21 75 22 73 32 L64 68 Q61 82 76 76 L89 62",
 "у":"M23 22 L18 63 C15 78 27 83 38 70 L57 22 M57 22 L49 77 C46 92 37 99 25 94 C14 89 26 77 41 79 M52 76 Q68 82 84 61",
 "ф":"M52 8 L43 93 M48 37 C35 20 20 36 22 54 C23 74 40 77 47 65 M51 37 C65 20 80 35 76 55 C72 72 56 77 49 64",
 "х":"M21 26 C35 29 42 49 55 67 C63 80 72 79 83 62 M78 23 C65 27 55 47 42 63 C32 75 24 79 16 73",
 "ц":"M21 23 L16 64 C14 80 28 83 36 70 L53 23 L47 65 C46 81 62 81 72 68 M73 23 L67 68 Q64 79 79 75 Q89 76 82 96",
 "ч":"M22 22 L18 50 C16 64 30 69 42 58 L68 24 L62 68 Q60 81 82 65",
 "ш":"M14 22 L9 68 C8 81 22 83 31 70 L43 30 L38 67 C35 82 50 82 59 70 L75 22 L69 68 C67 82 80 83 91 66",
 "щ":"M10 22 L7 68 C7 82 20 83 29 70 L41 30 L36 67 C34 82 48 82 57 70 L73 22 L67 68 C65 81 78 79 82 71 Q92 82 81 97",
 "ъ":"M15 30 Q32 20 46 26 L40 67 C39 79 50 83 64 75 C79 65 69 48 53 54 C45 57 42 62 42 68",
 "ы":"M18 22 L12 66 C11 81 23 81 36 74 C51 65 45 50 31 55 Q20 59 18 72 M71 22 L64 69 Q62 81 82 66",
 "ь":"M28 22 L21 68 C19 82 33 84 49 74 C63 65 56 50 41 55 Q29 60 24 70 M55 71 Q68 77 83 65",
 "э":"M25 29 C39 19 63 19 72 36 C83 55 69 74 50 78 Q32 80 20 69 M31 51 H70",
 "ю":"M25 22 L18 68 C17 80 27 82 35 70 L40 57 M38 50 L55 50 M69 22 C50 19 44 35 46 51 C47 70 55 80 68 79 C81 79 87 64 87 51 C87 35 80 23 69 22 Z",
 "я":"M75 24 C59 18 42 26 39 43 C35 55 43 66 58 64 C68 62 73 47 75 24 L67 70 C65 81 77 82 86 64 M45 60 Q32 71 20 76"
};
const writingCapitalPaths={
 "А":"M14 81 Q28 81 38 61 L64 12 C67 6 72 9 72 18 L69 73 Q69 85 85 70 M33 57 C45 58 58 57 73 54",
 "Б":"M31 18 Q54 13 79 14 M34 18 L25 78 C42 83 67 87 78 68 C85 51 69 43 51 47 L30 56",
 "В":"M28 19 C43 6 65 11 68 25 C72 41 52 49 33 50 C65 44 81 57 74 72 C67 88 41 88 23 79 L38 17",
 "Г":"M18 79 Q32 76 39 62 L53 18 Q57 14 66 17 L84 19 M53 18 C42 18 36 14 30 10",
 "Д":"M16 84 C30 81 41 73 46 52 L58 17 L71 77 M35 78 H83 M20 81 Q17 88 16 91 M80 78 Q85 89 79 93",
 "Е":"M73 15 Q46 9 33 29 C23 43 33 54 56 50 C34 49 18 64 28 78 C40 94 66 82 80 70 M30 51 Q48 51 70 47",
 "Ё":"M73 19 Q46 13 33 33 C23 47 33 58 56 54 C34 53 18 68 28 82 C40 98 66 86 80 74 M30 55 Q48 55 70 51 M44 5 l1 -2 M66 5 l1 -2",
 "Ж":"M15 20 Q42 35 49 53 Q42 71 18 84 M47 12 L50 88 M84 20 Q58 35 51 53 Q61 69 85 84 M24 52 H76",
 "З":"M24 24 Q43 6 63 18 C79 29 62 49 43 50 C70 46 86 65 69 80 C55 96 32 85 18 76",
 "И":"M27 17 L18 73 Q15 87 32 77 L74 19 L66 76 Q64 86 82 71",
 "Й":"M27 25 L18 73 Q15 87 32 77 L74 26 L66 76 Q64 86 82 71 M43 10 Q54 20 67 8",
 "К":"M34 16 L23 79 M76 16 Q67 31 46 50 Q56 50 72 72 Q79 82 87 70 M46 50 Q37 60 27 69",
 "Л":"M16 79 C30 77 41 60 50 27 Q56 10 61 21 L58 72 Q56 87 82 72",
 "М":"M10 79 L34 16 Q37 8 43 23 L53 60 L75 17 Q80 9 81 21 L74 78",
 "Н":"M27 17 L19 80 M73 17 L65 80 M25 50 Q48 51 71 50",
 "О":"M53 13 C36 11 22 29 21 49 C19 70 28 86 47 85 C66 85 80 69 80 47 C80 24 70 13 53 13 Z",
 "П":"M23 20 Q47 10 77 19 L69 80 M29 20 L21 79",
 "Р":"M29 80 L41 16 C58 11 79 15 77 34 C75 54 50 57 36 48",
 "С":"M76 26 C62 10 40 12 28 31 C13 55 22 77 42 83 C58 88 74 77 82 65",
 "Т":"M18 22 Q49 13 82 19 M50 19 L39 80",
 "У":"M19 20 Q31 35 48 66 M78 18 C67 47 51 77 25 88",
 "Ф":"M52 7 L43 92 M51 30 C35 17 21 31 23 49 C25 69 41 75 49 63 M51 30 C67 16 81 31 78 49 C75 68 59 74 50 62",
 "Х":"M21 20 Q47 46 73 79 M78 18 Q49 49 19 78",
 "Ц":"M23 16 L17 73 Q15 85 29 77 L48 26 M50 17 L44 72 Q42 83 64 77 M70 19 L64 74 Q64 82 80 76 Q86 86 77 94",
 "Ч":"M25 19 L20 51 C19 64 37 64 51 53 L74 20 M74 20 L66 79",
 "Ш":"M18 17 L11 70 Q11 85 27 77 L41 31 M45 17 L38 70 Q38 85 55 77 L69 31 M75 17 L68 70 Q68 85 85 74",
 "Щ":"M15 17 L8 71 Q8 85 24 77 L38 31 M43 17 L36 71 Q36 85 52 77 L66 31 M71 17 L64 71 Q64 85 80 76 Q91 83 80 94",
 "Ъ":"M14 19 Q36 13 50 19 L42 72 C54 88 81 78 79 59 C78 45 59 44 45 55",
 "Ы":"M24 18 L18 72 C31 86 55 78 57 61 C60 45 39 46 22 54 M78 19 L69 78",
 "Ь":"M32 18 L24 73 C41 87 70 78 71 61 C72 47 50 45 30 56",
 "Э":"M26 24 C42 13 66 13 75 31 C91 57 73 80 51 84 Q33 84 21 72 M30 51 H75",
 "Ю":"M18 18 L12 80 M16 49 H45 M64 15 C48 13 40 32 40 49 C40 69 48 85 65 84 C80 83 87 66 87 49 C87 31 80 16 64 15 Z",
 "Я":"M78 80 L68 19 C51 9 28 19 28 37 C28 52 46 58 62 50 M59 50 Q43 68 20 80"
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
 const letterItem=(letter,kind)=>({
  name:(kind==="capital"?"Заглавная":"Строчная")+" буква "+letter,
  path:kind==="capital"?writingCapitalPaths[letter]:writingLetterPaths[letter],
  kind
 });
 if(set==="Строчный алфавит а–я"||set==="Заглавный алфавит А–Я"||
    set==="Весь рукописный алфавит"){
  const lowercase=[...writingAlphabet].map(letter=>letterItem(letter,"letter"));
  const uppercase=[...writingAlphabet.toUpperCase()].map(letter=>letterItem(letter,"capital"));
  if(set==="Строчный алфавит а–я")return lowercase;
  if(set==="Заглавный алфавит А–Я")return uppercase;
  return lowercase.concat(uppercase);
 }
 if(set==="Первые письменные буквы"||set==="Второй набор букв"){
  const letters=set==="Первые письменные буквы"?['а','о','и','м']:['с','е','л','н'];
  return letters.flatMap(letter=>Array.from({length:3},()=>({
   name:"Строчная буква "+letter,path:writingLetterPaths[letter],kind:"letter"
  })));
 }
 if(set==="Одна письменная буква"){
  const letter=Object.hasOwn(writingLetterPaths,get("letter"))?get("letter"):"а";
  const capital=get("register")==="Заглавная";
  return Array.from({length:times},()=>
    letterItem(capital?letter.toUpperCase():letter,capital?"capital":"letter"));
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
 const isLetters=items.some(item=>item.kind==="letter"||item.kind==="capital");
 const allCapitals=items.length>0&&items.every(item=>item.kind==="capital");
 const group=isLetters?"Письменные буквы":
  get("set")==="Элементы письма"?"Элементы письма":"Цифры";
 const cell=(item,variant)=>{
  const capital=item.kind==="capital";
  const visual=variant==="blank"?"":'<svg class="writing-trace-svg'+(capital?' writing-trace-svg--capital':'')+
   '" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'+
   '<path d="'+item.path+'" class="writing-stroke writing-stroke--'+variant+'" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return '<div class="writing-cell writing-cell--'+variant+(capital?' writing-cell--capital':'')+'" aria-label="'+
   (variant==="sample"?"Образец":variant==="trace"?"Обведите пунктир":"Напишите самостоятельно")+'">'+visual+'</div>';
 };
 for(let i=0;i<items.length;i+=6){
  const rows=items.slice(i,i+6).map((item,j)=>
   '<div class="writing-row'+(item.kind==="capital"?' writing-row--capital':'')+'"><div class="writing-row-caption"><span class="writing-row-number">'+(i+j+1)+'.</span> '+e(item.name)+'</div>'+
   '<div class="writing-cells">'+['sample','trace','trace','trace','blank','blank'].map(v=>cell(item,v)).join("")+'</div></div>');
  parts.push(page(heading('Прописи · '+e(group),
   (isLetters?'Буквы русского алфавита · рабочая строка 7 мм · ':'')+
   'Обведи по образцу и попробуй самостоятельно · Имя: ____________________')+
   '<div class="writing-list">'+rows.join("")+'</div>'+
   '<p class="writing-footer">✦ Отличная работа! Продолжай тренироваться.</p>',
   'writing-page'+(isLetters?' writing-letter-page':'')+(allCapitals?' writing-capital-page':'')));
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
