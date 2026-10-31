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
const modes=['math','cards','labels','diploma','schedule','habits'];
const selectOptions={
 theme:['Лавандовый','Мятный','Персиковый','Минимализм']
};
test('every print generator offers four distinct curated quick starts',()=>{
 assert.deepEqual(Object.keys(kits).sort(),[...modes].sort());
 for(const mode of modes){
  assert.equal(kits[mode].length,4,mode);
  assert.equal(new Set(kits[mode].map(x=>x.id)).size,4,mode);
  for(const kit of kits[mode]){
   assert.match(kit.id,/^[a-z0-9-]+$/);
   assert.ok(kit.title.length>3&&kit.description.length>4);
   assert.ok(Object.keys(kit.values).length>=2);
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
 for(const kit of kits.labels)assert.ok(Number(kit.values.count)<=96);
});
