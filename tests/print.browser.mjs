import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {captureVisual,finishVisualReport} from './visual-artifacts.mjs';
import {chromium} from 'playwright';

const url = new URL('../index.html', import.meta.url).href;
const browser = await chromium.launch({headless: true});
const scenarios = [
  {id:'math',name:'math and answers',mode:'math',fields:{count:'40',key:'Да'},pages:3},
  {id:'cards',name:'40 flashcards',mode:'cards',fields:{items:Array.from({length:40},(_,i)=>'Слово '+i+' — перевод '+i).join('\n')},pages:5},
  {id:'labels-standard',name:'27 standard labels',mode:'labels',fields:{count:'27'},pages:3},
  {id:'labels-small',name:'27 small labels',mode:'labels',fields:{count:'27',size:'Маленькие 40 × 22 мм'},pages:1},
  {id:'labels-large',name:'27 large labels',mode:'labels',fields:{count:'27',size:'Крупные 80 × 48 мм'},pages:4},
  {id:'schedule',name:'weekly schedule',mode:'schedule',fields:{title:'Расписание уроков',items:Array.from({length:7},()=>Array.from({length:19},(_,i)=>'Урок '+(i+1)).join(',')).join('\n')},pages:3},
  {id:'habits',name:'31-day tracker',mode:'habits',fields:{month:'Октябрь',year:'2026',items:Array.from({length:15},(_,i)=>'Привычка '+i).join('\n')},pages:3},
  {id:'award',name:'children award',mode:'diploma',fields:{layout:'Детский',name:'Анна Иванова'},pages:1}
];
let failed = false;
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(url);
  for (const scenario of scenarios) {
    try {
      // Seed random math questions so PNG comparisons are reproducible.
      await page.evaluate(()=>{
        let seed=0xC0FFEE;
        Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      });
      await page.locator('[data-tab="'+scenario.mode+'"]').click();
      for (const [key,value] of Object.entries(scenario.fields)) {
        const element=page.locator('#f-'+key);
        if(await element.evaluate(el=>el.tagName)==='SELECT') await element.selectOption({label:value});
        else await element.fill(value);
        await element.dispatchEvent('change');
      }
      // A change listener on the last active field can fire when it loses focus.
      // Commit that edit before capturing the print snapshot.
      await page.locator('#print').focus();
      await page.evaluate(()=>document.fonts.ready);
      const previewCount=await page.locator('.sheet-page').count();
      assert.equal(previewCount,scenario.pages,'preview page count');
      const contentBefore=await page.locator('#paper').innerHTML();
      await page.evaluate(()=>{window.print=()=>{};});
      await page.locator('#print').click();
      assert.equal(await page.locator('#paper').innerHTML(),contentBefore,'printing must not regenerate the preview');

      await page.emulateMedia({media:'print'});
      const geometry=await page.locator('.sheet-page').evaluateAll(pages=>pages.map(p=>{
        const rect=p.getBoundingClientRect();
        const descendants=[...p.querySelectorAll('*')];
        const overflowing=descendants.filter(node=>{
          const r=node.getBoundingClientRect();
          return r.width>0 && r.height>0 && (r.right>rect.right+1 || r.bottom>rect.bottom+1 || r.left<rect.left-1 || r.top<rect.top-1);
        });
        return {width:rect.width,height:rect.height,overflow:overflowing.slice(0,5).map(x=>x.tagName+'.'+x.className)};
      }));
      for(const sheet of geometry){
        assert.ok(Math.abs(sheet.width-793.7)<2 && Math.abs(sheet.height-1122.5)<2,'A4 CSS geometry '+JSON.stringify(sheet));
        assert.deepEqual(sheet.overflow,[],'clipped content '+JSON.stringify(sheet));
      }
      const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
      const info=execFileSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
      const actualPages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
      assert.equal(actualPages,scenario.pages,'PDF page count');
      const a4=info.match(/Page size:\s+([\d.]+) x ([\d.]+) pts/);
      assert.ok(a4,'PDF page size is reported');
      assert.ok(Math.abs(Number(a4[1])-595.276)<1 && Math.abs(Number(a4[2])-841.89)<1,'PDF must be A4');
      await captureVisual(scenario.id,scenario.name,page,pdf,scenario.pages);
      await page.emulateMedia({media:'screen'});
      console.log('PASS',scenario.name,actualPages,'PDF pages');
    } catch(error) {
      failed=true;
      console.error('FAIL',scenario.name,error);
      await page.emulateMedia({media:'screen'});
    }
  }
  // Editor UX: preview must update while typing and printing must refuse clipped text.
  try{
    await page.locator('[data-tab="cards"]').click();
    await page.locator('#f-items').fill(['кот — cat','собака — dog','дом — house','окно — window'].join('\n'));
    await page.waitForFunction(()=>document.querySelectorAll('#paper .cards article').length===4);
    assert.equal(await page.locator('#paper .cards article').count(),4,'live card preview');

    await page.locator('#f-items').fill(Array.from({length:41},(_,i)=>'Слово '+i+' — перевод').join('\n'));
    await page.waitForFunction(()=>document.querySelector('#print').disabled===true);
    assert.match(await page.locator('#print-status').innerText(),/40 карточек/,'warn before truncating entries');
    await page.locator('#reset').click();
    assert.equal(await page.locator('#f-items').inputValue(),'cat — кошка\ndog — собака\nsun — солнце','reset restores defaults');
    await page.waitForFunction(()=>document.querySelector('#print').disabled===false);

    await page.locator('[data-tab="labels"]').click();
    await page.locator('#f-name').fill('ОченьДлинноеИмя'.repeat(80));
    await page.locator('#print').focus();
    await page.waitForFunction(()=>document.querySelector('#print').disabled===true);
    assert.match(await page.locator('#print-status').innerText(),/не помещается/,'warn about physically clipped text');
    await page.locator('#reset').click();
    await page.waitForFunction(()=>document.querySelector('#print').disabled===false);
    console.log('PASS live editor, limits, clipping warning and reset');
    // Quick starts apply curated content without replacing personal data.
    await page.locator('[data-tab="labels"]').click();
    await page.locator('#f-name').fill('Мария Соколова');
    await page.locator('#f-name').dispatchEvent('change');
    await page.locator('[data-starter="stationery"]').click();
    assert.equal(await page.locator('#f-name').inputValue(),'Мария Соколова','name must survive preset');
    assert.equal(await page.locator('#f-size').inputValue(),'Маленькие 40 × 22 мм');
    assert.equal(await page.locator('#paper .labels article').count(),32);
    assert.equal(await page.locator('#paper .sheet-page').count(),1);
    assert.match(await page.locator('#starter-status').innerText(),/Для мелочей/);
    assert.equal(await page.locator('[data-starter="stationery"]').getAttribute('aria-pressed'),'true');
    await page.locator('#f-subtitle').fill('Индивидуальная подпись');
    await page.waitForFunction(()=>document.querySelector('[data-starter="stationery"]').getAttribute('aria-pressed')==='false');
    await page.locator('[data-tab="diploma"]').click();
    await page.locator('#f-name').fill('Алексей Соколов');
    await page.locator('#f-issuer').fill('Мария Петровна');
    await page.locator('#f-issuer').dispatchEvent('change');
    await page.locator('[data-starter="reader"]').click();
    assert.equal(await page.locator('#f-name').inputValue(),'Алексей Соколов');
    assert.equal(await page.locator('#f-issuer').inputValue(),'Мария Петровна');
    assert.match(await page.locator('.diploma .award-reason').innerText(),/любовь к чтению/);
    console.log('PASS 18 starter kits present, instant application and private field preservation');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#starter-grid .starter-card').count(),4,'mobile starter kit cards');
    assert.equal(await page.locator('#nav-preview').isVisible(),true,'mobile navigation should be visible');
    await page.locator('#nav-preview').click();
    await page.waitForFunction(()=>document.querySelector('#print-preview').getBoundingClientRect().top<130);
    await page.locator('#nav-settings').click();
    await page.waitForFunction(()=>document.querySelector('#editor-controls').getBoundingClientRect().top<130);
    console.log('PASS mobile editor to preview navigation');
    await page.locator('[data-tab="habits"]').click();
    await page.waitForFunction(()=>{
      const p=document.querySelector('#paper');
      return p && p.getBoundingClientRect().width<390;
    });
    const mobile=await page.evaluate(()=>{
      const paper=document.querySelector('#paper').getBoundingClientRect();
      const box=document.querySelector('.scroll').getBoundingClientRect();
      return {left:paper.left,right:paper.right,boxLeft:box.left,boxRight:box.right,documentWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
    });
    assert.ok(mobile.left>=mobile.boxLeft-3 && mobile.right<=mobile.boxRight+3,'A4 preview should fit narrow screen '+JSON.stringify(mobile));
    assert.ok(mobile.documentWidth<=mobile.viewport+3,'no mobile horizontal page scrolling '+JSON.stringify(mobile));
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS mobile A4 preview at 390px');
    // Catalog discovery: featured, filters, search, quick-open and mobile layout.
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),6,'six featured catalog cards');
    await page.locator('#catalog-more').click();
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),24,'all 24 kits visible after expansion');
    await page.locator('#catalog-search').fill('чтение');
    assert.ok(await page.locator('#catalog-grid [data-template]').count()>0,'catalog finds reading kits');
    await page.locator('#catalog-filters [data-category="habits"]').click();
    const visibleModes=await page.locator('#catalog-grid [data-template]').evaluateAll(cards=>cards.map(x=>x.dataset.mode));
    assert.ok(visibleModes.length>0 && visibleModes.every(x=>x==='habits'),'category filter narrows to habits');
    await page.locator('#catalog-search').fill('несуществующийнабор12345');
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),0,'empty search');
    assert.equal(await page.locator('#catalog-empty').isVisible(),true,'empty state is visible');
    await page.locator('#catalog-search').fill('');
    await page.locator('#catalog-filters [data-category="all"]').click();
    await page.locator('#catalog-more').click();
    await page.locator('#catalog-grid [data-template="greetings"]').click();
    assert.equal(await page.locator('[data-tab="cards"]').getAttribute('aria-current'),'true','catalog opens cards editor');
    assert.match(await page.locator('#f-items').inputValue(),/Hello!/);
    assert.equal(await page.locator('#paper .cards article').count(),8,'catalog kit generates cards');
    await page.locator('[data-tab="labels"]').click();
    await page.locator('#f-name').fill('Тестовое имя');
    await page.locator('#f-name').dispatchEvent('change');
    await page.locator('#catalog-filters [data-category="labels"]').click();
    await page.locator('#catalog-grid [data-template="art"]').click();
    assert.equal(await page.locator('#f-name').inputValue(),'Тестовое имя','catalog keeps a typed personal name');
    await page.setViewportSize({width:390,height:844});
    const width=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(width.content<=width.viewport+3,'catalog should not cause mobile horizontal overflow '+JSON.stringify(width));
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),4,'four filtered labels at narrow viewport');
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS searchable template catalog, one-click editing and mobile layout');
  }catch(error){
    failed=true;
    console.error('FAIL editor usability',error);
  }
} finally {
  await finishVisualReport();
  await browser.close();
}
if(failed)process.exitCode=1;
