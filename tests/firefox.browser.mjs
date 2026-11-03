// P0.4: independent Gecko/Firefox @media print layout checks, compared with Chromium.
// Playwright only exports PDF from Chromium. This suite verifies Firefox's
// rendered A4 geometry and screenshots; it does not claim Firefox PDF parity.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,firefox} from 'playwright';

const url=new URL('../index.html',import.meta.url).href;
const folder='artifacts/firefox-print';
const week=Array.from({length:7},()=>Array.from({length:19},(_,i)=>'Урок '+(i+1)).join(',')).join('\n');
const scenarios=[
 {id:'math',mode:'math',fields:{count:'40',density:'Стандартный',key:'Да'},
  pages:3,selector:'.problems>div',items:40},
 {id:'math-words',mode:'math',fields:{grade:'1 класс',topic:'Текстовые задачи',max:'10',
  density:'Стандартный',count:'10',key:'Да'},pages:3,selector:'.math-word-question',items:10},
 {id:'writing',mode:'writing',fields:{set:'Цифры 0–9'},
  pages:2,selector:'.writing-row',items:10},
 {id:'duplex',mode:'cards',fields:{size:'Стандартные · 8 на листе',
  sides:'Двусторонняя',flip:'По длинному краю',
  items:Array.from({length:9},(_,i)=>'Term '+i+' — Answer '+i).join('\n')},
  pages:4,selector:'.flashcard[data-card-index]',items:18},
 {id:'labels',mode:'labels',fields:{count:'27',size:'Маленькие 40 × 22 мм'},
  pages:1,selector:'.labels article',items:27},
 {id:'diploma',mode:'diploma',fields:{layout:'Детский',name:'Анна Иванова'},
  pages:1,selector:'.diploma',items:1},
 {id:'schedule',mode:'schedule',fields:{title:'Расписание уроков',items:week},
  pages:3,selector:'.schedule-table tbody tr',items:19},
 {id:'habits',mode:'habits',fields:{month:'Октябрь',year:'2026',
  items:Array.from({length:15},(_,i)=>'Привычка '+i).join('\n')},
  pages:3,selector:'.habit tbody tr',items:15}
];
const mm=96/25.4, A4={width:210*mm,height:297*mm};
const nearly=(a,b,delta=2)=>Math.abs(a-b)<=delta;
const results={chromium:{},firefox:{}};

async function capture(browserType,engine){
 const browser=await browserType.launch({headless:true});
 try{
  for(const scenario of scenarios){
   const page=await browser.newPage({viewport:{width:1440,height:900}});
   try{
    await page.addInitScript(()=>{
     let seed=0xC0FFEE;
     Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    });
    await page.goto(url);
    await page.locator('[data-tab="'+scenario.mode+'"]').click();
    for(const [key,value] of Object.entries(scenario.fields)){
     const el=page.locator('#f-'+key);
     if(await el.evaluate(node=>node.tagName)==='SELECT')await el.selectOption({label:value});
     else await el.fill(value);
     await el.dispatchEvent('change');
    }
    // Ensure any 240ms typing debounce is applied before inspecting print layout.
    await page.locator('#print').focus();
    await page.waitForFunction(expected=>document.querySelectorAll('#paper .sheet-page').length===expected,scenario.pages);
    await page.waitForFunction(()=>!document.querySelector('#print').disabled);
    await page.evaluate(()=>document.fonts.ready);
    const before=await page.locator('#paper').innerHTML();
    await page.evaluate(()=>{window.print=()=>{}});
    await page.locator('#print').click();
    assert.equal(await page.locator('#paper').innerHTML(),before,
     engine+'/'+scenario.id+': print click must not mutate content');
    await page.emulateMedia({media:'print'});
    const layout=await page.evaluate(selector=>{
     const pages=[...document.querySelectorAll('#paper .sheet-page')];
     const boxes=pages.map(sheet=>{
      const r=sheet.getBoundingClientRect();
      const style=getComputedStyle(sheet);
      const pad=parseFloat(style.paddingLeft)||0;
      const bad=[...sheet.querySelectorAll('*')].filter(el=>{
       const b=el.getBoundingClientRect();
       return b.width>0&&b.height>0&&(b.left<r.left-2||b.right>r.right+2||
        b.top<r.top-2||b.bottom>r.bottom+2);
      });
      const headings=[...sheet.querySelectorAll(':scope > h2, :scope > p.sub')].map(el=>{
       const b=el.getBoundingClientRect();
       return {top:Math.round((b.top-r.top)*10)/10,height:Math.round(b.height*10)/10};
      });
      return {width:r.width,height:r.height,padding:pad,
       bad:bad.slice(0,5).map(el=>el.tagName.toLowerCase()+'.'+el.className),
       headings};
     });
     return {pages:boxes,items:document.querySelectorAll('#paper '+selector).length,
      paperTransform:getComputedStyle(document.querySelector('#paper')).transform,
      status:printIssues(),cardFaces:[...document.querySelectorAll('#paper .cards-page')].map(s=>s.classList.contains('cards-page--back')?'back':'front'),
      calendarCols:[...document.querySelectorAll('#paper .habits-page')].map(s=>s.querySelectorAll('col.habit-day-col').length)};
    },scenario.selector);
    assert.equal(layout.pages.length,scenario.pages,engine+'/'+scenario.id+' A4 page count');
    assert.equal(layout.items,scenario.items,engine+'/'+scenario.id+' printed item count');
    assert.deepEqual(layout.status,[],engine+'/'+scenario.id+' print validation');
    assert.equal(layout.paperTransform,'none',engine+'/'+scenario.id+' print transform');
    for(const [i,sheet] of layout.pages.entries()){
     assert.ok(nearly(sheet.width,A4.width)&&nearly(sheet.height,A4.height),
      engine+'/'+scenario.id+' page '+(i+1)+' expected A4 '+JSON.stringify(sheet));
     assert.deepEqual(sheet.bad,[],engine+'/'+scenario.id+' clipped page '+(i+1));
     assert.ok(nearly(sheet.padding,18*mm,2),engine+'/'+scenario.id+' A4 inner padding');
    }
    if(scenario.id==='duplex')assert.deepEqual(layout.cardFaces,
     ['front','back','front','back'],engine+' duplex page order');
    if(scenario.id==='habits')assert.ok(layout.calendarCols.every(n=>n===31),
     engine+' 31-day columns on every page');
    await page.locator('#paper .sheet-page').first().screenshot({
     path:folder+'/'+scenario.id+'-'+engine+'.png',animations:'disabled',scale:'css'
    });
    results[engine][scenario.id]=layout;
    console.log('PASS '+engine+' '+scenario.id+' '+layout.pages.length+' A4 pages');
   }finally{await page.close();}
  }
 }finally{await browser.close();}
}

let failed=false;
try{
 await mkdir(folder,{recursive:true});
 await capture(chromium,'chromium');
 await capture(firefox,'firefox');
 for(const scenario of scenarios){
  const a=results.chromium[scenario.id],b=results.firefox[scenario.id];
  assert.equal(a.items,b.items,scenario.id+' same printed data across engines');
  assert.equal(a.pages.length,b.pages.length,scenario.id+' same A4 page count across engines');
  for(let i=0;i<a.pages.length;i++){
   const ca=a.pages[i],fb=b.pages[i];
   assert.ok(nearly(ca.width,fb.width,2)&&nearly(ca.height,fb.height,2),
    scenario.id+' matching physical A4 dimensions');
   assert.equal(ca.headings.length,fb.headings.length,scenario.id+' matching title elements');
   for(let j=0;j<ca.headings.length;j++)
    assert.ok(nearly(ca.headings[j].top,fb.headings[j].top,12),
     scenario.id+' page '+(i+1)+' heading offset drift >12px: '+
     JSON.stringify([ca.headings[j],fb.headings[j]]));
  }
 }
 console.log('PASS Firefox and Chromium cross-engine A4 layout parity');
}catch(error){
 failed=true;
 console.error('FAIL Firefox A4 cross-browser check',error);
}finally{
 await mkdir(folder,{recursive:true});
 await writeFile(folder+'/comparison.json',JSON.stringify({
  generatedAt:new Date().toISOString(),note:'Firefox uses print CSS emulation, not PDF export or physical paper testing',
  results},null,2)+'\n');
}
if(failed)process.exitCode=1;
