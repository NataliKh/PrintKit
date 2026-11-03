import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
vm.runInContext(read('presets.js'),context);
vm.runInContext(read('app.js').split('\n')[1],context);
const kits=vm.runInContext('starterKits',context);
const configs=vm.runInContext('configs',context);
const modes=['math','writing','cards','labels','diploma','schedule','habits'];
const selectOptions={
 theme:['Лавандовый','Мятный','Персиковый','Минимализм']
};
test('every print generator offers curated, nonduplicate quick starts',()=>{
 assert.deepEqual(Object.keys(kits).sort(),[...modes].sort());
 for(const mode of modes){
  const expected=mode==='labels'?5:mode==='writing'?3:mode==='cards'?8:4;
  assert.equal(kits[mode].length,expected,mode);
  assert.equal(new Set(kits[mode].map(x=>x.id)).size,expected,mode);
  for(const kit of kits[mode]){
   assert.match(kit.id,/^[a-z0-9-]+$/);
   assert.ok(kit.title.length>3&&kit.description.length>4);
   assert.ok(Object.keys(kit.values).length>=(mode==='writing'?1:2));
  }
 }
});
test('preset values match actual input names and available select options',()=>{
 for(const mode of modes){
  const controls=new Map(configs[mode].map(([id,,type,choices])=>[id,{type,choices}]));
  for(const kit of kits[mode]){
   for(const [name,value] of Object.entries(kit.values)){
    const field=controls.get(name)|| (name==='theme'?{type:'select',choices:selectOptions.theme.join('|')}:null);
    assert.ok(field,mode+'/'+kit.id+' missing '+name);
    assert.equal(typeof value,'string');
    if(field.type==='select'){
     assert.ok(field.choices.split('|').includes(value),mode+'/'+kit.id+'/'+name+' invalid option '+value);
    }
   }
  }
 }
});
test('duplex starter includes valid flip direction and printing options',()=>{
 const kit=kits.cards.find(x=>x.id==='duplex');
 assert.ok(kit,'double-sided flashcards starter exists');
 assert.equal(kit.values.sides,'Двусторонняя');
 assert.equal(kit.values.flip,'По длинному краю');
 assert.ok(kit.values.items.split('\\n').length>=1);
});
test('personal names and certificate issuers are never overridden by presets',()=>{
 for(const kit of kits.labels)assert.ok(!Object.hasOwn(kit.values,'name'));
 for(const kit of kits.diploma){
  assert.ok(!Object.hasOwn(kit.values,'name'));
  assert.ok(!Object.hasOwn(kit.values,'issuer'));
 }
});
test('starter content stays within existing generator print limits',()=>{
 const countLines=s=>String(s).split(/\r?\n/).filter(Boolean).length;
 for(const kit of kits.cards)assert.ok(countLines(kit.values.items)<=40);
 for(const kit of kits.habits)assert.ok(countLines(kit.values.items)<=15);
 for(const kit of kits.schedule)assert.ok(countLines(kit.values.items)<=7);
 for(const kit of kits.math)assert.ok(Number(kit.values.count)<=40);
 for(const kit of kits.labels){
  if(kit.values.kit==='Школьный комплект'){
   const items=JSON.parse(kit.values.subjects);
   assert.ok(Array.isArray(items)&&items.length>0);
   const total=items.filter(item=>item.selected).reduce((sum,item)=>sum+item.qty,0);
   assert.ok(total>0&&total<=96);
  }else assert.ok(Number(kit.values.count)<=96);
 }
});
