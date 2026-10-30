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
