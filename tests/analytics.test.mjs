import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const original=readFileSync(new URL('../analytics.js',import.meta.url),'utf8');
function harness(counter,initial){
 const children=[],calls=[],tags=[];
 let stored=initial,banner,refreshes=0;
 const document={
  currentScript:{src:'https://natalikh.github.io/PrintKit/analytics.js'},
  createElement(tag){
   return {tag,children:[],setAttribute(){},append(...nodes){this.children.push(...nodes)},
    remove(){if(this===banner)banner=null}};
  },
  body:{append(node){banner=node;children.push(node)}},
  head:{appendChild(node){tags.push(node)}},
  querySelectorAll(){return []},
  addEventListener(){}
 };
 const localStorage={getItem(){return stored},setItem(_key,value){stored=value}};
 const location={href:'https://natalikh.github.io/PrintKit/',reload(){refreshes++}};
 const window={};
 const source=original.replace('const METRIKA_ID=0;', 'const METRIKA_ID='+counter+';');
 vm.runInNewContext(source,{document,localStorage,location,window,URL,Date,Set,Number});
 return {window,tags,children,get banner(){return banner},get stored(){return stored},get refreshes(){return refreshes}};
}
test('a missing counter ID never sends statistics or shows a consent banner',()=>{
 const app=harness(0,null);
 assert.equal(app.tags.length,0);
 assert.equal(app.banner,undefined);
 assert.equal(app.window.printKitAnalytics.enabled(),false);
 app.window.printKitAnalytics.goal('print_click');
 assert.equal(app.tags.length,0);
});
test('a configured counter cannot load before the visitor opts in',()=>{
 const app=harness(12345678,null);
 assert.equal(app.tags.length,0);
 assert.ok(app.banner,'consent choices must appear');
 assert.match(app.banner.children[0].textContent,/Яндекс Метрику/);
 const buttons=app.banner.children[2].children;
 assert.deepEqual(buttons.map(x=>x.textContent),['Разрешить','Без статистики']);
 buttons[1].onclick();
 assert.equal(app.stored,'no');
 assert.equal(app.tags.length,0);
 app.window.printKitAnalytics.goal('print_click');
 assert.equal(app.tags.length,0);
});
test('accepting consent loads Metrica once and allows only anonymous goal names',()=>{
 const app=harness(12345678,null);
 app.banner.children[2].children[0].onclick();
 assert.equal(app.stored,'yes');
 assert.equal(app.tags.length,1);
 assert.equal(app.tags[0].src,'https://mc.yandex.ru/metrika/tag.js');
 app.window.printKitAnalytics.goal('print_click');
 app.window.printKitAnalytics.goal('kit_saved');
 app.window.printKitAnalytics.goal('private_name_or_text');
 const queued=Array.from(app.window.ym.a,entry=>Array.from(entry));
 assert.equal(queued.length,3);
 assert.deepEqual(queued[1],[12345678,'reachGoal','print_click']);
 assert.deepEqual(queued[2],[12345678,'reachGoal','kit_saved']);
 app.window.printKitAnalytics.settings();
 app.banner.children[2].children[1].onclick();
 assert.equal(app.refreshes,1,'withdrawal reloads the page to stop the script');
});
test('a saved refusal does not load external code',()=>{
 const app=harness(12345678,'no');
 assert.equal(app.tags.length,0);
 assert.equal(app.banner,undefined);
});
