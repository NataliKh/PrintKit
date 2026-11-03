import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../math.js',import.meta.url),'utf8'),context);
vm.runInContext(readFileSync(new URL('../render.js',import.meta.url),'utf8'),context);
const render=vm.runInContext('renderSheet',context);
const vals={grade:'2 класс',topic:'Сложение и вычитание',count:'10',level:'Со скобками',title:'Тест',items:'cat — кошка\ndog — собака',name:'Анна',subtitle:'Школа',kind:'Грамота',reason:'Успехи',issuer:'Учитель',days:'7'};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lines=s=>String(s).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const clamp=(n,max)=>Math.max(1,Math.min(max,Number(n)||1));
for(const mode of ['math','writing','cards','labels','diploma','schedule','habits']){
 test(mode+' renders printable markup',()=>{const html=render(mode,key=>vals[key]??'',escape,lines,clamp);assert.ok(html.length>60);assert.match(html,/<h2>/)});
}
test('user text is escaped',()=>{const html=render('labels',key=>key==='name'?'<script>alert(1)</script>':(vals[key]??''),escape,lines,clamp);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/)});


test('original vector numerals render as printable tracing and free-writing cells',()=>{
 const html=render('writing',k=>({set:'Цифры 0–9'})[k]??'',escape,lines,clamp);
 assert.equal((html.match(/class="sheet-page writing-page"/g)||[]).length,2);
 assert.equal((html.match(/class="writing-row"/g)||[]).length,10);
 assert.equal((html.match(/class="writing-cell writing-cell--sample"/g)||[]).length,10);
 assert.equal((html.match(/class="writing-cell writing-cell--trace"/g)||[]).length,30);
 assert.equal((html.match(/class="writing-cell writing-cell--blank"/g)||[]).length,20);
 assert.equal((html.match(/<svg class="writing-trace-svg"/g)||[]).length,40);
 for(let i=0;i<=9;i++)assert.match(html,new RegExp('Цифра '+i));
 assert.doesNotMatch(html,/<foreignObject|<image |@font-face/);
});
test('one digit and pre-writing elements constrain repeats and invalid selections',()=>{
 const html=render('writing',k=>({set:'Одна цифра',digit:'5',rows:'12'})[k]??'',escape,lines,clamp);
 assert.equal((html.match(/class="writing-row"/g)||[]).length,12);
 assert.equal((html.match(/class="sheet-page writing-page"/g)||[]).length,2);
 assert.equal((html.match(/Цифра 5/g)||[]).length,12);
 for(const [set,element,count] of [
  ['Элементы письма','Все элементы',6],
  ['Элементы письма','Крючки',12],
  ['Элементы письма','<script>',6],
  ['Цифры 0–9','',10]
 ]){
  const output=render('writing',k=>({set,element,rows:'12'})[k]??'',escape,lines,clamp);
  assert.equal((output.match(/class="writing-row"/g)||[]).length,count);
  assert.doesNotMatch(output,/<script>/);
 }
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/\.writing-stroke--trace\{stroke:[^}]*stroke-dasharray:/);
 assert.match(css,/\.writing-cells\{display:grid/);
});


test('unverified Russian cursive alphabet is not offered as a printable worksheet',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const presets=readFileSync(new URL('../presets.js',import.meta.url),'utf8');
 const writingConfig=app.match(/writing:\[\["set","Что тренируем","select","([^"]+)"/);
 assert.ok(writingConfig,'writing mode configuration exists');
 assert.equal(writingConfig[1],'Цифры 0–9|Одна цифра|Элементы письма');
 assert.doesNotMatch(presets,/id:"letters"|id:"lowercase-alphabet"|id:"uppercase-alphabet"/);
 assert.match(app,/Буквенные прописи временно сняты/);
 const draft=render('writing',k=>({set:'Одна письменная буква',letter:'н'})[k]??'',
  escape,lines,clamp);
 assert.doesNotMatch(draft,/Строчная буква|Заглавная буква|writing-letter-page/);
});


test('cards 2.0 preserves one-sided pair view and respects 3 A4 sizes',()=>{
 for(const [size,capacity] of [['Стандартные · 8 на листе',8],
  ['Крупные · 4 на листе',4],['Компактные · 12 на листе',12]]){
  for(const count of [1,capacity,capacity+1,40]){
   const items=Array.from({length:count},(_,i)=>'Term '+i+' — Meaning '+i).join('\n');
   const html=render('cards',k=>({title:'Pairs',size,items,sides:'Односторонняя'})[k]??'',
    escape,lines,clamp);
   assert.equal((html.match(/class="sheet-page cards-page/g)||[]).length,
    Math.ceil(count/capacity),'A4 pages '+size+' '+count);
   assert.equal((html.match(/data-card-side="single"/g)||[]).length,count);
   assert.equal((html.match(/class="flashcard flashcard--empty"/g)||[]).length,
    Math.ceil(count/capacity)*capacity-count);
   for(let i=0;i<count;i++){
    assert.ok(html.includes('Term '+i));assert.ok(html.includes('Meaning '+i));
   }
  }
 }
});
test('double-sided flashcards have mirrored backs for both A4 edge flips',()=>{
 const sizes=[['Стандартные · 8 на листе',2,4],
  ['Крупные · 4 на листе',2,2],['Компактные · 12 на листе',3,4]];
 for(const [size,cols,rows] of sizes){
  const capacity=cols*rows;
  for(const flip of ['По длинному краю','По короткому краю']){
   for(const count of [1,capacity-1,capacity,capacity+1,40]){
    const items=Array.from({length:count},(_,i)=>'Front '+i+' — Back '+i).join('\n');
    const html=render('cards',k=>({title:'Q&A',size,items,sides:'Двусторонняя',flip})[k]??'',
     escape,lines,clamp);
    const pages=[...html.matchAll(/<section class="sheet-page ([^"]+)">([\s\S]*?)<\/section>/g)];
    assert.equal(pages.length,Math.ceil(count/capacity)*2);
    for(let pageIdx=0;pageIdx<pages.length;pageIdx+=2){
     assert.match(pages[pageIdx][1],/cards-page--front/);
     assert.match(pages[pageIdx+1][1],/cards-page--back/);
     const readSlots=markup=>[...markup.matchAll(/<article class="flashcard(?: flashcard--empty)?"[^>]*>([\s\S]*?)<\/article>/g)]
      .map(m=>({index:Number(m[0].match(/data-card-index="(\d+)"/)?.[1]??-1),content:m[1]}));
     const front=readSlots(pages[pageIdx][2]),back=readSlots(pages[pageIdx+1][2]);
     assert.equal(front.length,capacity);assert.equal(back.length,capacity);
     for(let slot=0;slot<capacity;slot++){
      const row=Math.floor(slot/cols),col=slot%cols;
      const mirror=flip==='По длинному краю'?row*cols+(cols-1-col):(rows-1-row)*cols+col;
      assert.equal(back[slot].index,front[mirror].index,
       'aligned physical slot '+slot+' '+size+' '+flip);
      if(back[slot].index>=0){
       assert.ok(back[slot].content.includes('Back '+back[slot].index));
       assert.ok(!back[slot].content.includes('Front '+back[slot].index));
      }
     }
    }
   }
  }
 }
});
test('flashcard text escaping and incomplete translations are safe',()=>{
 const html=render('cards',k=>({title:'<script>oops</script>',
  items:'<img src=x onerror=1> — <svg onload=1>\nOnly word',
  sides:'Двусторонняя'})[k]??'',escape,lines,clamp);
 assert.doesNotMatch(html,/<script>|<img |<svg /);
 assert.match(html,/&lt;img src=x onerror=1&gt;/);
 assert.match(html,/&lt;svg onload=1&gt;/);
 assert.equal((html.match(/data-card-side="front"/g)||[]).length,2);
 assert.equal((html.match(/data-card-side="back"/g)||[]).length,2);
});


test('flashcard validation flags missing translations, source lines and size limits',()=>{
 const parse=vm.runInContext('parseFlashcards',context),validate=vm.runInContext('validateFlashcards',context);
 const rows=parse('cat — кошка\n\nfox — лиса\nsingle');
 assert.deepEqual(Array.from(rows,r=>r.line),[1,3,4]);
 assert.equal(rows[1].back,'лиса');
 assert.match(validate('','Стандартные · 8 на листе')[0],/хотя бы одну/);
 assert.match(validate('\ncat\nfox — лиса','Стандартные · 8 на листе')[0],/Строка 2/);
 assert.match(validate('cat — ','Стандартные · 8 на листе')[0],/Строка 1/);
 assert.equal(validate('cat — кошка','Стандартные · 8 на листе').length,0);
 const long='слово '.repeat(11);
 assert.match(validate('cat — '+long,'Компактные · 12 на листе')[0],/Строка 1/);
 assert.equal(validate('cat — '+long,'Стандартные · 8 на листе').length,0);
 assert.equal(validate('cat — '+long,'Крупные · 4 на листе').length,0);
});
test('flashcard starter packs contain complete safe pairs',()=>{
 const kits=vm.runInNewContext(readFileSync(new URL('../presets.js',import.meta.url),'utf8')+';starterKits.cards');
 assert.equal(kits.length,8);
 assert.equal(new Set(kits.map(x=>x.id)).size,8);
 const validate=vm.runInContext('validateFlashcards',context);
 for(const kit of kits){
  assert.equal(validate(kit.values.items,kit.values.size||'Стандартные · 8 на листе').length,0,kit.id);
  assert.ok(kit.values.items.split('\n').length>=7);
 }
 for(const id of ['seasons','classroom','nature'])assert.ok(kits.some(x=>x.id===id));
});

test('math results stay inside the selected range',()=>{
 for(const level of ['Простые','Несколько действий','Со скобками']){
  for(let run=0;run<12;run++){
   const getter=k=>({grade:'2 класс',topic:'Сложение и вычитание',count:'40',max:'20',level,key:'Да'})[k]??'';
   const html=render('math',getter,escape,lines,clamp);
   const questions=[...html.matchAll(/<div>\d+\. ([^<]+) = <span class="math-answer-line"[^>]*><\/span><\/div>/g)];
   const answers=[...html.matchAll(/<span>\d+\. (\d+)<\/span>/g)].map(x=>Number(x[1]));
   assert.equal(questions.length,40);
   assert.equal(answers.length,40);
   for(let i=0;i<questions.length;i++){
    const expression=questions[i][1].replaceAll('−','-');
    assert.match(expression,/^[0-9 +()\-]+$/);
    const actual=Function('return ('+expression+')')();
    assert.equal(actual,answers[i]);
    assert.ok(actual>=0&&actual<=20);
   }
  }
 }
});


test('first-grade mixed worksheets balance practice and limit trivial exercises',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const maximum of [10,20]){
  for(const total of [10,20,40]){
   for(let trial=0;trial<100;trial++){
    const result=generate('1 класс','По программе класса','Простые',maximum,total);
    const questions=result.questions;
    assert.equal(questions.length,total);
    assert.equal(new Set(questions.map(q=>q.text)).size,total,'Repeated exercise in a normal range');
    const addition=questions.filter(q=>!q.blank&&q.text.includes(' + ')).length;
    const subtraction=questions.filter(q=>!q.blank&&q.text.includes(' − ')).length;
    const missing=questions.filter(q=>q.blank).length;
    assert.equal(addition,Math.round(total*0.35));
    assert.equal(subtraction,Math.round(total*0.35));
    assert.equal(missing,total-addition-subtraction);
    let trivialCount=0;
    for(const q of questions){
     const expression=q.blank?q.text.replace('□',String(q.answer)).split(' = ')[0]:q.text;
     const match=expression.match(/^(\d+) ([+−]) (\d+)$/);
     assert.ok(match,'Unexpected expression: '+expression);
     const a=Number(match[1]),b=Number(match[3]);
     assert.equal(match[2]==='+'?a+b:a-b,q.blank?Number(q.text.replace('□',String(q.answer)).split(' = ')[1]):q.answer);
     assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=maximum);
     if(match[2]==='+'?(a===0||b===0):(b===0||a===b))trivialCount++;
    }
    assert.equal(trivialCount,Math.min(2,Math.floor(total/20)));
   }
  }
 }
});

test('small first-grade range terminates even if distinct exercises run out',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const total of [10,20,40]){
  const {questions}=generate('1 класс','По программе класса','Простые',2,total);
  assert.equal(questions.length,total);
  assert.ok(questions.every(q=>Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=2));
 }
});


test('grades 2–5 mixed worksheets have valid arithmetic and no needless duplicates',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 const evaluate=text=>{
  const fraction=text.match(/^(\d+)\/(\d+) от (\d+)$/);
  if(fraction)return +fraction[1]/+fraction[2]*(+fraction[3]);
  assert.match(text,/^[\d+×−:()\s]+$/);
  return Function('return ('+text.replace(/−/g,'-').replace(/×/g,'*').replace(/ : /g,'/')+')')();
 };
 for(const grade of ['2 класс','3 класс','4 класс','5 класс']){
  for(const limit of [2,10,20,50,100,200]){
   for(const level of ['Простые','Несколько действий','Со скобками']){
    for(const count of [10,20,40]){
     for(let run=0;run<6;run++){
      const generated=generate(grade,'По программе класса',level,limit,count);
      assert.equal(generated.questions.length,count);
      if(limit>=10)assert.equal(new Set(generated.questions.map(q=>q.text)).size,count,
       grade+' '+limit+' '+level+' has repeated expressions');
      for(const q of generated.questions){
       assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=generated.maximum);
       const filled=q.blank?q.text.replace('□',String(q.answer)):q.text;
       const parts=filled.split(' = ');
       if(q.blank){
        assert.equal(parts.length,2);
        assert.equal(evaluate(parts[0]),evaluate(parts[1]));
       }else assert.equal(evaluate(filled),q.answer);
      }
     }
    }
   }
  }
 }
});
test('each upper-grade mixed worksheet covers its available skills',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(let run=0;run<100;run++){
  const second=generate('2 класс','По программе класса','Простые',20,20).questions;
  assert.ok(second.some(q=>q.blank));
  assert.ok(second.some(q=>!q.blank&&q.text.includes(' + ')));
  assert.ok(second.some(q=>!q.blank&&q.text.includes(' − ')));
  assert.ok(second.some(q=>!q.blank&&/^\d+ \+ [1-9]$/.test(q.text)&&q.answer>=10));
  const third=generate('3 класс','По программе класса','Простые',100,20).questions;
  assert.ok(third.some(q=>q.text.includes(' × ')));
  assert.ok(third.some(q=>q.text.includes(' : ')));
  const fourth=generate('4 класс','По программе класса','Простые',100,20).questions;
  assert.ok(fourth.some(q=>q.text.includes(' × ')&&(q.text.includes(' + ')||q.text.includes(' − '))));
  const fifth=generate('5 класс','По программе класса','Простые',100,20).questions;
  assert.ok(fifth.some(q=>q.text.includes(' от ')));
 }
});
test('tiny selected maximum still produces a full mixed sheet',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const grade of ['2 класс','3 класс','4 класс','5 класс']){
  const output=generate(grade,'По программе класса','Простые',2,40);
  assert.equal(output.questions.length,40);
  assert.ok(output.questions.every(q=>q.answer>=0&&q.answer<=2));
 }
});


test('math density paginates A4 and preserves worksheet numbers and answers',()=>{
 // Short exercises should preserve the original density pagination.
 const snapshot={topic:'Сложение и вычитание',questions:
  Array.from({length:40},(_,i)=>({text:(i%8+1)+' + 2',answer:i%8+3}))};
 const original=[...snapshot.questions].map(q=>q.text);
 for(const [density,perPage,cssClass] of [
  ['Крупный',12,'large'],['Стандартный',20,'standard'],['Компактный',30,'compact']
 ]){
  for(const count of [10,20,40]){
   const sheet={...snapshot,questions:snapshot.questions.slice(0,count)};
   const values={...vals,grade:'2 класс',topic:'Сложение и вычитание',level:'Простые',
    count:String(count),density,key:'Да'};
   const html=render('math',k=>values[k]??'',escape,lines,clamp,sheet);
   assert.equal((html.match(/class="sheet-page /g)||[]).length,Math.ceil(count/perPage)+1);
   assert.equal((html.match(new RegExp('math-page--'+cssClass,'g'))||[]).length,Math.ceil(count/perPage));
   assert.equal((html.match(/class="math-answer-line"/g)||[]).length,count);
   assert.equal((html.match(/<span>\d+\. \d+<\/span>/g)||[]).length,count);
   const worksheet=html.split('<section class="sheet-page answers-page">')[0];
   for(let i=1;i<=count;i++)assert.ok(worksheet.includes(i+'. '),'Question '+i+' present');
   assert.deepEqual([...snapshot.questions].map(q=>q.text),original);
  }
 }
 const fallback=render('math',k=>({...vals,grade:'1 класс',topic:'Сложение и вычитание',level:'Простые',
  max:'10',count:'40',density:'invalid'})[k]??'',escape,lines,clamp);
 assert.equal((fallback.match(/math-page--standard/g)||[]).length,2);
});

test('math layout renders a supplied snapshot without changing its exercises',()=>{
 const snapshot=vm.runInContext("mathGenerate('1 класс','По программе класса','Простые',10,20)",context);
 const getter=k=>({grade:'1 класс',topic:'По программе класса',level:'Простые',max:'10',
  count:'20',density:'Крупный',key:'Да'})[k]??'';
 const large=render('math',getter,escape,lines,clamp,snapshot);
 const compact=render('math',k=>k==='density'?'Компактный':getter(k),escape,lines,clamp,snapshot);
 const questions=html=>[...html.matchAll(/<div>\d+\. ([\s\S]*?)<\/div>/g)].map(m=>m[1]);
 assert.deepEqual(questions(large),questions(compact));
 assert.equal((large.match(/class="sheet-page math-page /g)||[]).length,2);
 assert.equal((compact.match(/class="sheet-page math-page /g)||[]).length,1);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/currentMathSignature!==signature/);
 assert.match(app,/mode==="math"\?currentMath:null/);
});


test('long arithmetic formulas use full-width A4 rows with complete answer keys',()=>{
 const all=Array.from({length:40},(_,i)=>({
  text:(i+1)+' × (100 − 99) + 0',answer:i+1
 }));
 for(const [density,perPage,wide] of [
  ['Крупный',12,false],['Стандартный',16,true],['Компактный',20,true]
 ]){
  for(const count of [13,21,31,40]){
   const snapshot={topic:'Порядок действий',questions:all.slice(0,count)};
   const get=k=>({grade:'4 класс',topic:'Порядок действий',density,key:'Да'})[k]??'';
   const html=render('math',get,escape,lines,clamp,snapshot);
   const pages=[...html.matchAll(/class="sheet-page math-page ([^"]+)"/g)];
   assert.equal(pages.length,Math.ceil(count/perPage),density+' '+count+' page count');
   assert.ok(pages.every(p=>p[1].includes('math-page--wide')===wide));
   assert.equal((html.match(/class="math-answer-line"/g)||[]).length,count);
   assert.equal((html.match(/<span>\d+\. \d+<\/span>/g)||[]).length,count);
   const worksheet=html.split('<section class="sheet-page answers-page">')[0];
   for(let i=1;i<=count;i++)
    assert.ok(worksheet.includes(i+'. '+i+' × (100 − 99) + 0 = '));
  }
 }
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/#paper \.math-page \.problems>div\{[^}]*white-space:nowrap/);
 assert.match(css,/#paper \.math-page--wide \.problems\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
});
test('short arithmetic retains two-column compact and standard layouts',()=>{
 const qs=Array.from({length:40},(_,i)=>({text:(i%7+1)+' + 2',answer:i%7+3}));
 for(const [density,perPage] of [['Стандартный',20],['Компактный',30]]){
  const html=render('math',k=>({grade:'2 класс',density,key:'Нет'})[k]??'',
   escape,lines,clamp,{topic:'По программе класса',questions:qs});
  assert.equal((html.match(/class="sheet-page math-page /g)||[]).length,Math.ceil(40/perPage));
  assert.doesNotMatch(html,/math-page--wide/);
 }
});


test('comparison and number composition are mathematically correct for grades 1–2',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const grade of ['1 класс','2 класс'])for(const max of [2,10,20,50,100])
  for(const topic of ['Сравнение чисел','Состав числа'])for(const count of [10,20,40])
   for(let trial=0;trial<40;trial++){
    const result=generate(grade,topic,'Простые',max,count);
    assert.equal(result.questions.length,count);
    if(max>=10)assert.equal(new Set(result.questions.map(q=>q.text)).size,count);
    for(const q of result.questions){
     assert.equal(q.blank,true);
     if(topic==='Сравнение чисел'){
      const m=q.text.match(/^(\d+) □ (\d+)$/);
      assert.ok(m,'comparison '+q.text);
      const [a,b]=m.slice(1).map(Number);
      assert.ok(a>=0&&b>=0&&a<=result.maximum&&b<=result.maximum);
      assert.equal(q.answer,a<b?'<':a>b?'>':'=');
     }else{
      const m=q.text.match(/^(\d+) = (?:(\d+) \+ □|□ \+ (\d+))$/);
      assert.ok(m,'composition '+q.text);
      const sum=+m[1],known=Number(m[2]??m[3]);
      assert.ok(sum>=1&&sum<=result.maximum&&known>=0&&known<=sum);
      assert.equal(q.answer,sum-known);
     }
    }
    if(max>=10&&topic==='Сравнение чисел'){
     const signs=new Set(result.questions.map(q=>q.answer));
     assert.ok(['<','>','='].every(sign=>signs.has(sign)));
    }
   }
});
test('comparison answer key escapes less-than and greater-than signs',()=>{
 const snapshot={topic:'Сравнение чисел',questions:[
  {text:'3 □ 9',answer:'<',blank:true,kind:'comparison'},
  {text:'9 □ 3',answer:'>',blank:true,kind:'comparison'},
  {text:'6 □ 6',answer:'=',blank:true,kind:'comparison'}
 ]};
 const html=render('math',key=>({grade:'1 класс',density:'Крупный',key:'Да'})[key]??'',
  escape,lines,clamp,snapshot);
 assert.equal((html.match(/class="math-comparison"/g)||[]).length,3);
 assert.equal((html.match(/Место для знака сравнения/g)||[]).length,3);
 assert.match(html,/<span>1\. &lt;<\/span>/);
 assert.match(html,/<span>2\. &gt;<\/span>/);
 assert.match(html,/<span>3\. =<\/span>/);
 assert.equal((html.match(/class="sheet-page /g)||[]).length,2);
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/\.math-comparison \.math-answer-line\{width:12mm/);
});
test('composition prints with unchanged answers in all three A4 densities',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 const snapshot=generate('2 класс','Состав числа','Простые',20,40);
 const old=snapshot.questions.map(q=>q.text);
 for(const density of ['Крупный','Стандартный','Компактный']){
  const html=render('math',key=>({grade:'2 класс',topic:'Состав числа',count:'40',
   key:'Да',density})[key]??'',escape,lines,clamp,snapshot);
  assert.equal((html.match(/class="math-answer-line"/g)||[]).length,40);
  assert.equal((html.match(/<span>\d+\. \d+<\/span>/g)||[]).length,40);
  assert.ok((html.match(/class="sheet-page /g)||[]).length>=3);
  assert.deepEqual(snapshot.questions.map(q=>q.text),old);
 }
});


test('first/second-grade word problems have a unique verifiable arithmetic solution',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const grade of ['1 класс','2 класс'])for(const max of [2,10,20,50,100])
  for(const count of [10,20,40])for(let run=0;run<35;run++){
   const output=generate(grade,'Текстовые задачи','Со скобками',max,count);
   const questions=output.questions;
   assert.equal(questions.length,count);
   if(max>=10)assert.equal(new Set(questions.map(q=>q.text)).size,count,'duplicate story');
   const kinds={'+':0,'−':0};
   for(const q of questions){
    assert.equal(q.kind,'word');
    assert.ok(q.text.endsWith('?'));
    assert.match(q.text,/^.+ (?:был|было) \d+ /);
    assert.ok(!/undefined|null|NaN/.test(q.text));
    assert.ok(Number.isInteger(q.answer)&&q.answer>=1&&q.answer<=output.maximum);
    assert.ok(['+','−'].includes(q.operation));
    kinds[q.operation]++;
    const [a,b]=Array.from(q.operands);
    assert.ok(a>=1&&a<=output.maximum&&b>=1&&b<=output.maximum);
    assert.equal(q.answer,q.operation==='+'?a+b:a-b);
    assert.equal(q.solution,a+' '+q.operation+' '+b+' = '+q.answer);
    assert.ok(q.text.includes(String(a))&&q.text.includes(String(b)));
    assert.ok(q.unit.length>=3);
   }
   assert.ok(Math.abs(kinds['+']-kinds['−'])<=1);
  }
});

test('word problem pages have writing space and matching key in three densities',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 for(const grade of ['1 класс','2 класс'])for(const count of [10,20,40]){
  const snapshot=generate(grade,'Текстовые задачи','Простые',20,count);
  const original=snapshot.questions.map(q=>q.text);
  for(const [density,perPage] of [['Крупный',4],['Стандартный',6],['Компактный',8]]){
   const html=render('math',k=>({grade,topic:'Текстовые задачи',density,
    count:String(count),key:'Да'})[k]??'',escape,lines,clamp,snapshot);
   assert.equal((html.match(/class="sheet-page math-page /g)||[]).length,Math.ceil(count/perPage));
   assert.equal((html.match(/class="sheet-page /g)||[]).length,Math.ceil(count/perPage)+1);
   assert.equal((html.match(/class="math-word-question"/g)||[]).length,count);
   assert.equal((html.match(/class="math-word-solution-line"/g)||[]).length,count);
   assert.equal((html.match(/class="math-word-response"/g)||[]).length,count);
   assert.equal((html.match(/class="math-answer-line"/g)||[]).length,count);
   assert.equal((html.match(/class="answer-grid math-word-answer-grid"/g)||[]).length,1);
   for(const q of snapshot.questions){
    assert.ok(html.includes(escape(q.text)));
    assert.ok(html.includes(escape(q.solution)));
   }
   assert.deepEqual(snapshot.questions.map(q=>q.text),original);
  }
 }
 const sample=generate('1 класс','Текстовые задачи','Простые',10,10);
 const noKey=render('math',k=>({grade:'1 класс',key:'Нет',density:'Крупный'})[k]??'',
  escape,lines,clamp,sample);
 assert.doesNotMatch(noKey,/class="answer-grid math-word-answer-grid"/);
});

test('habit tracker reserves a name column and 31 checkbox columns',()=>{
 const getter=k=>({title:'Мои привычки',items:'Читать\nЗарядка\nПить воду',days:'31'})[k]??'';
 const html=render('habits',getter,escape,lines,clamp);
 assert.match(html,/<colgroup><col class="habit-name-col">/);
 assert.equal((html.match(/class="habit-day-col"/g)||[]).length,31);
 assert.equal((html.match(/class="habit-name"/g)||[]).length,3);
 assert.equal((html.match(/class="habit-box"/g)||[]).length,93);
 assert.match(html,/>Пить воду<\/th>/);
});

test('A4 pagination preserves the number of items and hard page boundaries',()=>{
 const cases=[
  ['math',{grade:'1 класс',topic:'Сложение и вычитание',level:'Простые',max:'10',count:'40',key:'Да'},3,/class="problems"/g,2],
  ['cards',{items:Array.from({length:40},(_,i)=>'Term '+i+' — Value '+i).join('\n')},5,/data-card-side="single"/g,40],
  ['labels',{count:'27'},3,/<article>/g,27],
  ['schedule',{items:Array.from({length:7},()=>Array.from({length:19},(_,i)=>'Предмет '+i).join(',')).join('\n')},3,/<tr>/g,22],
  ['habits',{days:'31',items:Array.from({length:15},(_,i)=>'Привычка '+i).join('\n')},3,/class="habit-box"/g,465],
 ];
 for(const [mode,overrides,pages,pattern,items] of cases){
  const html=render(mode,k=>({...vals,...overrides})[k]??'',escape,lines,clamp);
  assert.equal((html.match(/class="sheet-page /g)||[]).length,pages,mode+' pages');
  assert.equal((html.match(pattern)||[]).length,items,mode+' items');
 }
});
test('31-day habit tracker keeps the 27% name column on each sheet',()=>{
 const html=render('habits',k=>({title:'Трекер',days:'31',items:Array.from({length:15},()=> 'Пить достаточно воды и регулярно читать').join('\n')})[k]??'',escape,lines,clamp);
 assert.equal((html.match(/<col class="habit-name-col">/g)||[]).length,3);
 assert.equal((html.match(/class="habit-day-col"/g)||[]).length,93);
 assert.equal((html.match(/class="habit-box"/g)||[]).length,465);
});
test('math page breaks keep exactly twenty questions per sheet without regenerating',()=>{
 const html=render('math',k=>({...vals,grade:'1 класс',topic:'Сложение и вычитание',level:'Простые',max:'10',count:'40',key:'Да'})[k]??'',escape,lines,clamp);
 const pages=html.split(/(?=<section class="sheet-page )/).filter(Boolean);
 assert.equal(pages.length,3);
 assert.equal((pages[0].match(/class="math-answer-line"/g)||[]).length,20);
 assert.equal((pages[1].match(/class="math-answer-line"/g)||[]).length,20);
 assert.equal((pages[2].match(/<span>\d+\. /g)||[]).length,40);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/window\.print\(\)/);
 assert.match(app,/if\(inputTimer\)\{/,'only pending edits should trigger a refresh before print');
 assert.match(app,/currentMathSignature!==signature/,'math regenerates only for changed exercise settings');
});
test('missing-number problems render clear writing lines without box glyphs',()=>{
 const html=render('math',k=>({...vals,grade:'1 класс',topic:'Пропущенное число',count:'40',key:'Да'})[k]??'',escape,lines,clamp);
 const worksheet=html.split('<section class="sheet-page answers-page">')[0];
 assert.equal((worksheet.match(/class="math-answer-line"/g)||[]).length,40);
 assert.doesNotMatch(worksheet,/□|= ______/);
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/#paper \.math-answer-line\{[^}]*width:16mm;[^}]*border-bottom:/);
});
test('print stylesheet defines exact sized sheets with page breaks',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/#paper \.sheet-page\{[^}]*width:210mm;[^}]*height:297mm;/);
 assert.match(css,/break-after:page/);
 assert.match(css,/\.sheet-page:last-child\{break-after:auto/);
});

test('calendar tracker follows month length including leap years',()=>{
 for(const [month,year,days] of [['Февраль','2028',29],['Февраль','2027',28],['Апрель','2026',30],['Октябрь','2026',31]]){
  const html=render('habits',key=>({title:'План',items:'Читать',month,year,days:'5'})[key]??'',escape,lines,clamp);
  assert.equal((html.match(/class="habit-day-col"/g)||[]).length,days);
  assert.equal((html.match(/class="habit-box"/g)||[]).length,days);
  assert.match(html,new RegExp(month+' '+year));
 }
});
test('calendar weekends highlighted; undated tracker stays compatible',()=>{
 const dated=render('habits',key=>({title:'План',items:'Читать',month:'Ноябрь',year:'2026'})[key]??'',escape,lines,clamp);
 assert.equal((dated.match(/class="habit-day-heading habit-weekend"/g)||[]).length,9);
 assert.equal((dated.match(/class="habit-day habit-weekend"/g)||[]).length,9);
 const undated=render('habits',key=>({title:'План',items:'Читать',days:'31'})[key]??'',escape,lines,clamp);
 assert.doesNotMatch(undated,/habit-weekend/);
 assert.equal((undated.match(/class="habit-box"/g)||[]).length,31);
});

test('three label layouts keep all 27 labels on three A4 sheets',()=>{
 for(const layout of ['Классический','Школьный','Нежный']){
  const html=render('labels',key=>({...vals,count:'27',layout,name:'Аня <script>'})[key]??'',escape,lines,clamp);
  assert.equal((html.match(/class="sheet-page labels-page"/g)||[]).length,3);
  assert.equal((html.match(/<article>/g)||[]).length,27);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/Аня &lt;script&gt;/);
  assert.equal((html.match(/class="label-mark"/g)||[]).length,layout==='Школьный'?0:27);
 }
});
test('three diploma layouts keep award content escaped on one A4 sheet',()=>{
 for(const layout of ['Торжественный','Современный','Детский']){
  const html=render('diploma',key=>({...vals,layout,name:'Пётр & Мария',reason:'Отличные успехи!'})[key]??'',escape,lines,clamp);
  assert.equal((html.match(/class="sheet-page diploma-page"/g)||[]).length,1);
  assert.match(html,/Пётр &amp; Мария/);
  assert.match(html,/Отличные успехи!/);
  assert.match(html,/class="diploma diploma--(formal|modern|kids)"/);
 }
});
test('untrusted layout values never become CSS classes',()=>{
 const html=render('diploma',key=>({...vals,layout:'"><script>alert(1)</script>'})[key]??'',escape,lines,clamp);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/class="diploma diploma--formal"/);
});

test('label sizes paginate without dropping items',()=>{
 const cases=[
  ['Стандартные 54 × 38 мм',12,3],
  ['Маленькие 40 × 22 мм',32,1],
  ['Крупные 80 × 48 мм',8,4]
 ];
 for(const [size,perPage,pages] of cases){
  const html=render('labels',key=>({...vals,size,count:'27'})[key]??'',escape,lines,clamp);
  assert.equal((html.match(/class="sheet-page labels-page"/g)||[]).length,pages);
  assert.equal((html.match(/<article>/g)||[]).length,27);
  const chunks=html.split(/(?=<section class="sheet-page labels-page">)/).filter(Boolean);
  assert.ok(chunks.every(x=>(x.match(/<article>/g)||[]).length<=perPage));
 }
});
test('labels cap count at 96 and do not inject arbitrary layout CSS',()=>{
 const html=render('labels',key=>({...vals,count:'9999',size:'\"><img src=x onerror=alert(1)>'})[key]??'',escape,lines,clamp);
 assert.equal((html.match(/<article>/g)||[]).length,96);
 assert.match(html,/labels--size-standard/);
 assert.doesNotMatch(html,/<img/);
});
test('print label sizes are expressed in millimetres',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 for(const [size,width,height] of [['standard',54,38],['small',40,22],['large',80,48]]){
  assert.ok(css.includes('labels--size-'+size+' article{width:'+width+'mm;height:'+height+'mm'));
 }
});


test('school notebook labels show only the name and practical caption',()=>{
 const inputs={...vals,layout:'Школьный',size:'Стандартные 54 × 38 мм',count:'12',name:'Худякова Наталья',subtitle:'Тетрадь'};
 const html=render('labels',key=>inputs[key]??'',escape,lines,clamp);
 assert.match(html,/labels--school/);
 assert.doesNotMatch(html,/class="label-mark"/);
 assert.doesNotMatch(html,/ИМЕННАЯ НАКЛЕЙКА|✎/);
 assert.equal((html.match(/<article>/g)||[]).length,12);
 assert.match(html,/<article><b>Худякова Наталья<\/b><small>Тетрадь<\/small><\/article>/);
 const classic=render('labels',key=>({...inputs,layout:'Классический'})[key]??'',escape,lines,clamp);
 assert.match(classic,/class="label-mark"/); // Other layouts retain their decoration.
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/#paper \.labels--school article\{/);
 assert.match(css,/border:1px solid var\(--sheet-border\)/);
 assert.match(css,/#paper \.labels--size-small\.labels--school article\{/);
 assert.doesNotMatch(css,/#paper \.labels--school article::before/);
});

test('school kit prints selected subjects in the requested quantities and order',()=>{
 const subjects=[{name:'Математика',selected:true,qty:2},{name:'Русский язык',selected:true,qty:3},
 {name:'География',selected:false,qty:2},{name:'Чтение',selected:true,qty:1}];
 const data={...vals,kit:'Школьный комплект',layout:'Школьный',size:'Стандартные 54 × 38 мм',
  name:'Аня',subjects:JSON.stringify(subjects),count:'27'};
 const html=render('labels',key=>data[key]??'',escape,lines,clamp);
 assert.match(html,/Школьный комплект наклеек/);
 assert.equal((html.match(/<article>/g)||[]).length,6,'2 + 3 + 1 labels');
 assert.equal((html.match(/<small>Математика<\/small>/g)||[]).length,2);
 assert.equal((html.match(/<small>Русский язык<\/small>/g)||[]).length,3);
 assert.equal((html.match(/<small>Чтение<\/small>/g)||[]).length,1);
 assert.doesNotMatch(html,/География/);
 assert.ok(html.indexOf('Математика')<html.indexOf('Русский язык'));
 assert.ok(html.indexOf('Русский язык')<html.indexOf('Чтение'));
 assert.equal((html.match(/class="sheet-page /g)||[]).length,1);
});
test('school kit stays A4-paginated for three label sizes',()=>{
 const subjects=[{name:'Математика',selected:true,qty:24},{name:'Русский язык',selected:true,qty:24},
 {name:'История',selected:true,qty:24},{name:'Английский',selected:true,qty:24}];
 for(const [size,perPage] of [
  ['Стандартные 54 × 38 мм',12],['Маленькие 40 × 22 мм',32],['Крупные 80 × 48 мм',8]
 ]){
  const data={...vals,kit:'Школьный комплект',layout:'Школьный',size,subjects:JSON.stringify(subjects)};
  const html=render('labels',key=>data[key]??'',escape,lines,clamp);
  assert.equal((html.match(/<article>/g)||[]).length,96);
  assert.equal((html.match(/class="sheet-page /g)||[]).length,96/perPage);
 }
});
test('school kit escapes custom subjects and rejects malformed records',()=>{
 const data={...vals,kit:'Школьный комплект',layout:'Школьный',
  subjects:JSON.stringify([{name:'<img src=x onerror=alert(1)>',selected:true,qty:1}])};
 const html=render('labels',key=>data[key]??'',escape,lines,clamp);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 const decode=vm.runInContext('parseSchoolSubjects',context);
 assert.equal(decode('broken').length,0);
 assert.equal(decode(JSON.stringify({not:'an array'})).length,0);
 assert.equal(decode(JSON.stringify([{name:'Тест',selected:true,qty:500}]))[0].qty,24);
});
test('default identical labels stay unchanged with school kit selector present',()=>{
 const data={...vals,kit:'Одинаковые',layout:'Школьный',count:'12',subtitle:'Тетрадь'};
 const html=render('labels',key=>data[key]??'',escape,lines,clamp);
 assert.equal((html.match(/<small>Тетрадь<\/small>/g)||[]).length,12);
 assert.doesNotMatch(html,/Школьный комплект наклеек/);
});


test('family label names are split, trimmed and restricted to six',()=>{
 const parse=vm.runInContext('parseLabelNames',context);
 assert.equal(Array.from(parse('  Аня  Соколова \r\n\n Матвей Соколов  ')).join('|'),'Аня Соколова|Матвей Соколов');
 assert.equal(parse(Array.from({length:8},(_,i)=>'Ребёнок '+i).join('\n')).length,6);
 assert.equal(parse(null).length,0);
});
test('two children each receive their own complete school subject set',()=>{
 const subjects=JSON.stringify([{name:'Математика',selected:true,qty:2},{name:'История',selected:true,qty:1},
 {name:'Физкультура',selected:false,qty:5}]);
 const data={...vals,kit:'Школьный комплект',audience:'Несколько детей',
  names:'Анна Соколова\nМарк Соколов',subjects,layout:'Школьный',size:'Стандартные 54 × 38 мм'};
 const html=render('labels',key=>data[key]??'',escape,lines,clamp);
 assert.equal((html.match(/<article>/g)||[]).length,6);
 assert.equal((html.match(/<b>Анна Соколова<\/b>/g)||[]).length,3);
 assert.equal((html.match(/<b>Марк Соколов<\/b>/g)||[]).length,3);
 assert.equal((html.match(/<small>Математика<\/small>/g)||[]).length,4);
 assert.equal((html.match(/<small>История<\/small>/g)||[]).length,2);
 assert.doesNotMatch(html,/Физкультура/);
 assert.ok(html.indexOf('<b>Анна Соколова')<html.indexOf('<b>Марк Соколов'));
});
test('identical family labels scale quantity per child and paginate all sizes',()=>{
 for(const [size,perPage] of [
 ['Стандартные 54 × 38 мм',12],['Маленькие 40 × 22 мм',32],['Крупные 80 × 48 мм',8]
 ]){
  const data={...vals,kit:'Одинаковые',audience:'Несколько детей',names:'Аня\nМарк',
   count:'24',subtitle:'Тетрадь',size,layout:'Школьный'};
  const html=render('labels',key=>data[key]??'',escape,lines,clamp);
  assert.equal((html.match(/<article>/g)||[]).length,48);
  assert.equal((html.match(/class="sheet-page /g)||[]).length,Math.ceil(48/perPage));
  assert.equal((html.match(/<b>Аня<\/b>/g)||[]).length,24);
  assert.equal((html.match(/<b>Марк<\/b>/g)||[]).length,24);
 }
});
test('family names remain escaped; single-child mode ignores saved siblings',()=>{
 const data={...vals,kit:'Школьный комплект',audience:'Несколько детей',names:'<img src=x onerror=alert(1)>\nМарк',
 subjects:JSON.stringify([{name:'Русский',selected:true,qty:1}])};
 const html=render('labels',key=>data[key]??'',escape,lines,clamp);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 const single=render('labels',key=>({...data,audience:'Один ребёнок',name:'Аня'})[key]??'',escape,lines,clamp);
 assert.equal((single.match(/<article>/g)||[]).length,1);
 assert.doesNotMatch(single,/Марк/);
});

test('grade-specific topics, arithmetic correctness and integer answers',()=>{
 const generate=vm.runInContext('mathGenerate',context);
 const topics=vm.runInContext('mathTopicsByGrade',context);
 const evaluate=text=>{
  const equation=text.replace(/−/g,'-').replace(/×/g,'*').replace(/:/g,'/');
  const fraction=equation.match(/^(\d+)\/(\d+) от (\d+)$/);
  if(fraction)return Number(fraction[1])*Number(fraction[3])/Number(fraction[2]);
  assert.match(equation,/^[\d+*/()\s.-]+$/);
  return Function('return ('+equation+')')();
 };
 for(const [grade,available] of Object.entries(topics)){
  for(const topic of available){
   for(const limit of [10,20,50,100,200]){
    for(let trial=0;trial<12;trial++){
     const result=generate(grade,topic,'Со скобками',limit,40);
     assert.equal(result.questions.length,40);
     for(const q of result.questions){
      if(topic==='Текстовые задачи'){
       assert.equal(q.kind,'word');
       assert.ok(Number.isInteger(q.answer)&&q.answer>=1&&q.answer<=result.maximum);
       const m=q.solution.match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
       assert.ok(m,'solution '+q.solution);
       const a=+m[1],b=+m[3],value=+m[4];
       assert.equal(m[2]==='+'?a+b:a-b,value);
       assert.equal(q.answer,value);
       assert.ok(q.text.includes(String(a))&&q.text.includes(String(b))&&q.text.endsWith('?'));
       continue;
      }
      if(topic==='Сравнение чисел'){
       const m=q.text.match(/^(\d+) □ (\d+)$/);
       assert.ok(m,grade+' '+JSON.stringify(q));
       const left=+m[1],right=+m[2];
       assert.ok(left>=0&&left<=result.maximum&&right>=0&&right<=result.maximum);
       assert.equal(q.answer,left<right?'<':left>right?'>':'=');
       assert.equal(q.blank,true);
       assert.equal(q.kind,'comparison');
       continue;
      }
      assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=limit,grade+' '+topic+': '+JSON.stringify(q));
      if(q.blank){
       const parts=q.text.replace('□',String(q.answer)).split(' = ');
       assert.equal(parts.length,2);
       assert.equal(evaluate(parts[0]),evaluate(parts[1]),grade+' '+q.text);
      }else{
       assert.equal(evaluate(q.text),q.answer,grade+' '+q.text);
      }
     }
    }
   }
  }
 }
 assert.ok(!topics['1 класс'].includes('Таблица умножения'));
 assert.ok(topics['3 класс'].includes('Таблица умножения'));
 const html=render('math',k=>({grade:'3 класс',topic:'Таблица умножения',max:'100',
  count:'20',level:'Простые',key:'Да'})[k]??'',escape,lines,clamp);
 assert.equal((html.match(/×/g)||[]).length,20);
 assert.equal((html.match(/class="sheet-page /g)||[]).length,2);
 assert.match(html,/Тема: Таблица умножения/);
});
