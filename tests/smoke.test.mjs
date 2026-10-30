import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../render.js',import.meta.url),'utf8'),context);
const render=vm.runInContext('renderSheet',context);
const vals={grade:'2 класс',count:'10',level:'Со скобками',title:'Тест',items:'cat — кошка\ndog — собака',name:'Анна',subtitle:'Школа',kind:'Грамота',reason:'Успехи',issuer:'Учитель',days:'7'};
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const lines=s=>String(s).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
const clamp=(n,max)=>Math.max(1,Math.min(max,Number(n)||1));
for(const mode of ['math','cards','labels','diploma','schedule','habits']){
 test(mode+' renders printable markup',()=>{const html=render(mode,key=>vals[key]??'',escape,lines,clamp);assert.ok(html.length>60);assert.match(html,/<h2>/)});
}
test('user text is escaped',()=>{const html=render('labels',key=>key==='name'?'<script>alert(1)</script>':(vals[key]??''),escape,lines,clamp);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/)});

test('math results stay inside the selected range',()=>{
 for(const level of ['Простые','Несколько действий','Со скобками']){
  for(let run=0;run<12;run++){
   const getter=k=>({grade:'2 класс',count:'40',max:'20',level,key:'Да'})[k]??'';
   const html=render('math',getter,escape,lines,clamp);
   const questions=[...html.matchAll(/<div>\d+\. ([^<]+) = ______<\/div>/g)];
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
  ['math',{count:'40',key:'Да'},3,/class="problems"/g,2],
  ['cards',{items:Array.from({length:40},(_,i)=>'Term '+i+' — Value '+i).join('\\n')},5,/<article>/g,40],
  ['labels',{count:'27'},3,/<article>/g,27],
  ['schedule',{items:Array.from({length:7},()=>Array.from({length:19},(_,i)=>'Предмет '+i).join(',')).join('\\n')},3,/<tr>/g,22],
  ['habits',{days:'31',items:Array.from({length:15},(_,i)=>'Привычка '+i).join('\\n')},3,/class="habit-box"/g,465],
 ];
 for(const [mode,overrides,pages,pattern,items] of cases){
  const html=render(mode,k=>({...vals,...overrides})[k]??'',escape,lines,clamp);
  assert.equal((html.match(/class="sheet-page /g)||[]).length,pages,mode+' pages');
  assert.equal((html.match(pattern)||[]).length,items,mode+' items');
 }
});
test('31-day habit tracker keeps the 27% name column on each sheet',()=>{
 const html=render('habits',k=>({title:'Трекер',days:'31',items:Array.from({length:15},()=> 'Пить достаточно воды и регулярно читать').join('\\n')})[k]??'',escape,lines,clamp);
 assert.equal((html.match(/<col class="habit-name-col">/g)||[]).length,3);
 assert.equal((html.match(/class="habit-day-col"/g)||[]).length,93);
 assert.equal((html.match(/class="habit-box"/g)||[]).length,465);
});
test('math page breaks keep exactly twenty questions per sheet without regenerating',()=>{
 const html=render('math',k=>({...vals,count:'40',key:'Да'})[k]??'',escape,lines,clamp);
 const pages=html.split(/(?=<section class="sheet-page )/).filter(Boolean);
 assert.equal(pages.length,3);
 assert.equal((pages[0].match(/= ______/g)||[]).length,20);
 assert.equal((pages[1].match(/= ______/g)||[]).length,20);
 assert.equal((pages[2].match(/<span>\\d+\\. /g)||[]).length,40);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/window\\.print\\(\\)/);
 assert.doesNotMatch(app,/\\$\\("print"\\)\\.onclick=\\(\\)=>\\{[^}]*generate\\(/);
});
test('print stylesheet defines exact sized sheets with page breaks',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/#paper \\.sheet-page\\{[^}]*width:210mm;[^}]*height:297mm;/);
 assert.match(css,/break-after:page/);
 assert.match(css,/\.sheet-page:last-child\\{break-after:auto/);
});
