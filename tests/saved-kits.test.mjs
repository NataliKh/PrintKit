import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source('app.js').split('\n')[0],context);
vm.runInContext(source('app.js').split('\n')[1],context);
vm.runInContext(source('saved-kits.js'),context);
const store=vm.runInContext('savedKitStore',context);
const configs=vm.runInContext('configs',context);
const modes=vm.runInContext('modes',context);
for(const name of ['cards','labels','diploma','schedule','habits'])configs[name].unshift(['theme','Стиль оформления','select','Лавандовый|Мятный|Персиковый|Минимализм']);

class MemoryStore{
 data=new Map();
 getItem(k){return this.data.get(k)??null}
 setItem(k,v){this.data.set(k,String(v))}
 removeItem(k){this.data.delete(k)}
}
const add=(storage,mode,name,values)=>store.add(storage,modes,configs,mode,name,values);
const read=storage=>store.read(storage,modes,configs);
const remove=(storage,id)=>store.remove(storage,modes,configs,id);

test('save, reopen and delete a personal project without losing input',()=>{
 const storage=new MemoryStore();
 const saved=add(storage,'labels','  Наклейки   для Маши  ',{
  name:'Маша <img src=x onerror=alert(1)>',
  subtitle:'Тетради',
  count:'12',layout:'Школьный',size:'Стандартные 54 × 38 мм',
  theme:'Лавандовый'
 });
 assert.equal(saved.ok,true);
 assert.equal(saved.entry.name,'Наклейки для Маши');
 const [entry]=read(storage);
 assert.equal(entry.values.name,'Маша <img src=x onerror=alert(1)>');
 assert.equal(entry.values.size,'Стандартные 54 × 38 мм');
 assert.equal(remove(storage,entry.id).ok,true);
 assert.equal(read(storage).length,0);
});

test('snapshots are independent across generators and never silently overwritten',()=>{
 const storage=new MemoryStore();
 assert.equal(add(storage,'cards','Английский',{title:'Животные',items:'cat — кошка\ndog — собака'}).ok,true);
 assert.equal(add(storage,'diploma','Похвала',{name:'Аня',reason:'За старание!',issuer:'Учитель'}).ok,true);
 const cards=read(storage).find(x=>x.mode==='cards');
 const award=read(storage).find(x=>x.mode==='diploma');
 assert.equal(cards.values.items,'cat — кошка\ndog — собака');
 assert.equal(award.values.name,'Аня');
 assert.notEqual(cards.id,award.id);
});

test('reject empty, oversized names and never silently truncate long fields',()=>{
 const storage=new MemoryStore();
 assert.equal(add(storage,'cards','   ',{title:'A'}).code,'name');
 assert.equal(add(storage,'cards','A'.repeat(49),{title:'A'}).code,'name');
 assert.equal(add(storage,'cards','Набор',{items:'а'.repeat(8001)}).code,'values');
 assert.equal(read(storage).length,0);
});

test('saved projects are capped at twelve and contain only known fields',()=>{
 const storage=new MemoryStore();
 for(let i=0;i<store.LIMIT;i++){
  assert.equal(add(storage,'math','Тренировка '+i,{grade:'2 класс',count:'12',evil:'x'}).ok,true);
 }
 assert.equal(add(storage,'math','Ещё одна',{count:'1'}).code,'limit');
 assert.equal(read(storage).length,store.LIMIT);
 assert.equal(Object.hasOwn(read(storage)[0].values,'evil'),false);
});

test('invalid stored data or select values never become editor state',()=>{
 const storage=new MemoryStore();
 storage.setItem(store.KEY,'not-json');
 assert.equal(read(storage).length,0);
 const saved=add(storage,'labels','Коробки',{name:'Аня',layout:'<img>',count:'4'});
 assert.equal(saved.ok,true);
 const [entry]=read(storage);
 assert.equal(Object.hasOwn(entry.values,'layout'),false);
 assert.equal(entry.values.name,'Аня');
 storage.setItem(store.KEY,JSON.stringify({version:1,items:[{
  id:'not safe\" onmouseover=\"alert(1)',mode:'labels',name:'X',values:{name:'X'},savedAt:Date.now()
 }]}));
 assert.equal(read(storage).length,0);
});

test('storage errors return an actionable failure, without claiming success',()=>{
 const broken={
  getItem(){return null},
  setItem(){throw Error('quota exceeded')}
 };
 assert.equal(add(broken,'math','Примеры',{count:'12'}).code,'storage');
 assert.equal(remove(broken,'missing').code,'missing');
});
