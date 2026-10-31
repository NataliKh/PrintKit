import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
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

  // Redesign QA: real A4 paper, three sizes and representative Russian names.
  try{
    await page.locator('[data-tab="labels"]').click();
    await page.locator('#reset').click();
    const inputs=[['name','Худякова Наталья'],['subtitle','Тетрадь']];
    for(const [key,value] of inputs){
      await page.locator('#f-'+key).fill(value);
      await page.locator('#f-'+key).dispatchEvent('change');
    }
    await page.locator('#f-layout').selectOption({label:'Школьный'});
    for(const [size,name,expectedWidth,expectedHeight] of [
      ['Стандартные 54 × 38 мм','Худякова Наталья',54,38],
      ['Маленькие 40 × 22 мм','Анна',40,22],
      ['Крупные 80 × 48 мм','Худякова Наталья',80,48]
    ]){
      await page.locator('#f-name').fill(name);
      await page.locator('#f-name').dispatchEvent('change');
      await page.locator('#f-size').selectOption({label:size});
      await page.locator('#f-count').fill('1');
      await page.locator('#f-count').dispatchEvent('change');
      // Let the 240 ms debounced live preview finish before switching print media.
      await page.waitForFunction(({name,size})=>{
        const label=document.querySelector('#paper .labels--school article');
        return label && label.querySelector('b')?.textContent===name &&
          document.querySelector('#paper .labels article')===label &&
          document.querySelectorAll('#paper .labels article').length===1 &&
          document.querySelector('#f-size').value===size &&
          !document.querySelector('#print').disabled;
      },{name,size});
      await page.waitForTimeout(320);
      await page.emulateMedia({media:'print'});
      const measurements=await page.evaluate(()=>{
        const el=document.querySelector('#paper .sheet-page .labels--school article');
        if(!el)throw new Error('school label missing in print media');
        const article=el.getBoundingClientRect();
        const name=el.querySelector('b');
        const subtitle=el.querySelector('small');
        const items=[name,subtitle].map(x=>{
          const rect=x.getBoundingClientRect();
          return {text:x.textContent,left:rect.left-article.left,right:article.right-rect.right,
            top:rect.top-article.top,bottom:article.bottom-rect.bottom};
        });
        const css=getComputedStyle(el);
        return {width:article.width,height:article.height,border:css.borderTopStyle,bg:css.backgroundColor,
          hasDecorativeMark:!!el.querySelector('.label-mark'),
          stripe:getComputedStyle(el,'::before').content,
          overflow:el.scrollHeight-el.clientHeight,items};
      });
      assert.ok(Math.abs(measurements.width-expectedWidth*96/25.4)<2,'exact label width '+JSON.stringify(measurements));
      assert.ok(Math.abs(measurements.height-expectedHeight*96/25.4)<2,'exact label height '+JSON.stringify(measurements));
      assert.equal(measurements.border,'solid','school label uses clean solid border');
      assert.equal(measurements.hasDecorativeMark,false,'no redundant label heading');
      assert.equal(measurements.stripe,'none','no unnecessary top stripe');
      assert.equal(measurements.items[0].text,name,'name is the first and primary element');
      assert.equal(measurements.items[1].text,'Тетрадь','caption remains legible');
      for(const item of measurements.items){
        assert.ok(item.left>=-2&&item.right>=-2&&item.top>=-2&&item.bottom>=-2,
          'school label element must fit '+JSON.stringify(measurements));
      }
      assert.ok(measurements.overflow<=2,'school label content does not overflow');
      const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
      const info=execFileSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
      assert.match(info,/Pages:\s+1/,'single print page for one school label');
      await mkdir('artifacts/ui',{recursive:true});
      const tag=expectedWidth+'x'+expectedHeight;
      await page.locator('#paper .labels--school article').first().screenshot({
        path:'artifacts/ui/school-label-'+tag+'.png',animations:'disabled'
      });
      if(expectedWidth===54)await page.locator('.sheet-page').first().screenshot({
        path:'artifacts/ui/school-labels-a4.png',animations:'disabled'
      });
      await page.emulateMedia({media:'screen'});
      console.log('PASS redesigned school label',size,'and A4 PDF');
    }
  }catch(error){
    failed=true;
    console.error('FAIL school label redesign',error);
    await page.emulateMedia({media:'screen'});
  }

  // Visual control regression: native dropdown arrow is replaced, focus stays visible.
  try {
    await page.locator('[data-tab="labels"]').click();
    const select=page.locator('#f-layout');
    const checkSelects=async()=>{
      const styles=await page.locator('#fields select').evaluateAll(elements=>elements.map(el=>{
        const css=getComputedStyle(el),rect=el.getBoundingClientRect();
        return {appearance:css.appearance,image:css.backgroundImage,padding:parseFloat(css.paddingRight),width:rect.width,right:rect.right};
      }));
      assert.equal(styles.length,5,'labels have five custom dropdowns');
      for(const item of styles){
        assert.equal(item.appearance,'none','hide platform-native arrow');
        assert.ok(item.image.includes('data:image/svg+xml'),'SVG chevron is visible');
        assert.ok(item.padding>=40,'text cannot collide with the arrow');
        assert.ok(item.right<=page.viewportSize().width+3,'dropdown must fit the viewport');
      }
    };
    await checkSelects();
    await select.focus();
    assert.ok((await select.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('data:image/svg+xml'),'focused dropdown keeps its chevron');
    await select.selectOption({label:'Нежный'});
    assert.equal(await select.inputValue(),'Нежный','styled select stays keyboard/browser-operable');
    await mkdir('artifacts/ui',{recursive:true});
    await page.locator('#fields').screenshot({path:'artifacts/ui/selects-desktop.png',animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    await checkSelects();
    await page.locator('#fields').screenshot({path:'artifacts/ui/selects-mobile.png',animations:'disabled'});
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS custom select chevrons at desktop/mobile widths, focus and interaction');
  }catch(error){
    failed=true;
    console.error('FAIL select styling',error);
    await page.setViewportSize({width:1440,height:900});
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
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),25,'all 25 kits visible after expansion');
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
    assert.equal(await page.locator('#catalog-grid [data-template]').count(),5,'five filtered labels at narrow viewport');
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS searchable template catalog, one-click editing and mobile layout');
    // The saved-set control belongs after the editable fields, not above them.
    const compact=await page.evaluate(()=>{
      const fields=document.querySelector('#fields').getBoundingClientRect();
      const saved=document.querySelector('#saved-section').getBoundingClientRect();
      const summary=document.querySelector('#saved-section summary').getBoundingClientRect();
      const actions=document.querySelector('.actions').getBoundingClientRect();
      return {fieldsBottom:fields.bottom,savedTop:saved.top,summaryHeight:summary.height,actionsTop:actions.top,
        sectionWidth:saved.width,editorWidth:document.querySelector('.editor-panel').clientWidth};
    });
    assert.ok(compact.savedTop>=compact.fieldsBottom-2,'saved control should follow settings '+JSON.stringify(compact));
    assert.ok(compact.savedTop<compact.actionsTop,'saved control should precede print actions');
    assert.ok(compact.summaryHeight<=70,'collapsed saved control should stay compact '+JSON.stringify(compact));
    assert.ok(compact.sectionWidth<=compact.editorWidth,'saved control must fit editor');
    assert.equal(await page.locator('#saved-count').isVisible(),false,'hide distracting zero counter');
    assert.match(await page.locator('#saved-hint').innerText(),/Сохранить текущие настройки/);
    const chevron=page.locator('#saved-section .saved-chevron');
    assert.equal(await chevron.innerText(),'','saved arrow is a decorative SVG, not a text glyph');
    const collapsedArrow=await chevron.evaluate(el=>{
      const css=getComputedStyle(el);
      return {image:css.backgroundImage,width:parseFloat(css.width),height:parseFloat(css.height),transform:css.transform};
    });
    assert.ok(collapsedArrow.image.includes('data:image/svg+xml'),'saved arrow uses same SVG as selects');
    assert.equal(collapsedArrow.width,16);
    assert.equal(collapsedArrow.height,16);
    const alignedArrow=await page.evaluate(()=>{
      const select=document.querySelector('#f-size').getBoundingClientRect();
      const arrow=document.querySelector('.saved-chevron').getBoundingClientRect();
      return {selectCenterX:select.right-23,arrowCenterX:arrow.left+arrow.width/2,
        gridColumn:getComputedStyle(document.querySelector('.saved-chevron')).gridColumnStart};
    });
    assert.equal(alignedArrow.gridColumn,'4','saved arrow must use final grid column even with hidden count');
    assert.ok(Math.abs(alignedArrow.selectCenterX-alignedArrow.arrowCenterX)<=1.5,
      'saved arrow and dropdown arrow must align horizontally '+JSON.stringify(alignedArrow));
    await mkdir('artifacts/ui',{recursive:true});
    await page.locator('#saved-section').screenshot({path:'artifacts/ui/saved-collapsed-desktop.png',animations:'disabled'});
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('#saved-section').isVisible(),false,'saved UI stays off the printable A4 page');
    await page.emulateMedia({media:'screen'});

    // Named projects persist across reload and switch generators without losing custom inputs.
    await page.locator('#saved-section summary').click();
    await page.waitForFunction(()=>{
      const arrow=document.querySelector('#saved-section .saved-chevron');
      return getComputedStyle(arrow).transform==='matrix(-1, 0, 0, -1, 0, 0)';
    });
    await page.locator('#saved-name').fill('Ярлыки семьи');
    await page.locator('#saved-save').click();
    assert.equal(await page.locator('.saved-item').count(),1,'first personal project');
    assert.equal(await page.locator('#saved-count').isVisible(),true,'counter shown when nonempty');
    assert.equal(await page.locator('#saved-count').innerText(),'1');
    const filledAlignment=await page.evaluate(()=>{
      const select=document.querySelector('#f-size').getBoundingClientRect();
      const arrow=document.querySelector('.saved-chevron').getBoundingClientRect();
      return Math.abs((select.right-23)-(arrow.left+arrow.width/2));
    });
    assert.ok(filledAlignment<=1.5,'saved arrow stays aligned when count is visible');
    await page.locator('#saved-section').screenshot({path:'artifacts/ui/saved-expanded-desktop.png',animations:'disabled'});
    assert.match(await page.locator('#saved-status').innerText(),/сохранён/);

    await page.locator('[data-tab="math"]').click();
    await page.locator('#f-count').fill('14');
    await page.locator('#saved-name').fill('Математика на неделю');
    await page.locator('#saved-save').click();
    assert.equal(await page.locator('.saved-item').count(),2,'projects from different generators');

    await page.reload();
    await page.locator('#saved-section summary').click();
    assert.equal(await page.locator('.saved-item').count(),2,'projects survive reload');
    await page.locator('.saved-item').filter({hasText:'Ярлыки семьи'}).locator('.saved-open').click();
    assert.equal(await page.locator('[data-tab="labels"]').getAttribute('aria-current'),'true','saved set restores generator');
    assert.equal(await page.locator('#f-name').inputValue(),'Тестовое имя','saved personal label is restored');
    assert.equal(await page.locator('#f-subtitle').inputValue(),'Творчество','saved subtitle is restored');
    assert.equal(await page.locator('#print').isDisabled(),false,'saved set prints correctly');
    const beforeSavedPrint=await page.locator('#paper').innerHTML();
    await page.evaluate(()=>window.print=()=>{});
    await page.locator('#print').click();
    assert.equal(await page.locator('#paper').innerHTML(),beforeSavedPrint,'printing saved project must not regenerate content');

    const removal=page.locator('.saved-item').filter({hasText:'Ярлыки семьи'}).locator('.saved-remove');
    page.once('dialog',dialog=>dialog.dismiss());
    await removal.click();
    assert.equal(await page.locator('.saved-item').count(),2,'cancel deletion leaves project untouched');
    page.once('dialog',dialog=>dialog.accept());
    await removal.click();
    assert.equal(await page.locator('.saved-item').count(),1,'confirmed deletion removes only chosen project');

    await page.locator('#saved-name').fill('<img src=x onerror=alert(1)>');
    await page.locator('#saved-save').click();
    assert.equal(await page.locator('.saved-item').count(),2);
    assert.equal(await page.locator('#saved-list img').count(),0,'project names are HTML-escaped');

    await page.setViewportSize({width:390,height:844});
    const savedWidth=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(savedWidth.body<=savedWidth.viewport+3,'saved-set list must fit mobile viewport '+JSON.stringify(savedWidth));
    const mobileAlignment=await page.evaluate(()=>{
      const select=document.querySelector('#f-size').getBoundingClientRect();
      const arrow=document.querySelector('.saved-chevron').getBoundingClientRect();
      return Math.abs((select.right-23)-(arrow.left+arrow.width/2));
    });
    assert.ok(mobileAlignment<=1.5,'saved arrow and dropdown must align at 390px: '+mobileAlignment);
    const mobileBox=await page.locator('#saved-section').boundingBox();
    assert.ok(mobileBox && mobileBox.width<=390,'mobile saved panel fits viewport');
    await page.locator('#saved-section').screenshot({path:'artifacts/ui/saved-expanded-mobile.png',animations:'disabled'});
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS saved projects: persistence, restoration, printing, deletion, escaping and mobile');
  }catch(error){
    failed=true;
    console.error('FAIL editor usability',error);
  }
  // School kit: selection, per-subject counts, custom entry, persistence and PDF.
  try{
    await page.locator('[data-tab="labels"]').click();
    await page.locator('#reset').click();
    await page.locator('#f-name').fill('Мария Соколова');
    await page.locator('#f-name').dispatchEvent('change');
    await page.locator('#f-kit').selectOption({label:'Школьный комплект'});
    assert.equal(await page.locator('[data-field-id="subjects"]').isVisible(),true);
    assert.equal(await page.locator('[data-field-id="count"]').isVisible(),false);
    assert.equal(await page.locator('[data-field-id="subtitle"]').isVisible(),false);
    assert.equal(await page.locator('#school-subject-list .school-subject-row').count(),10);
    assert.equal(await page.locator('#paper .labels article').count(),12,'default kit makes 12 stickers');
    const row=title=>page.locator('.school-subject-row').filter({hasText:title});
    await row('Тетрадь').locator('.school-subject-check').uncheck();
    assert.equal(await page.locator('#paper .labels article').count(),10);
    await row('Математика').locator('.school-subject-qty input').fill('3');
    await row('Математика').locator('.school-subject-qty input').dispatchEvent('change');
    assert.equal(await page.locator('#paper .labels article').count(),11);
    await page.locator('#school-new-name').fill('Информатика');
    await page.locator('#school-add-button').click();
    assert.equal(await page.locator('#paper .labels article').count(),12);
    assert.equal(await page.locator('#paper .labels article:has(small:text-is("Информатика"))').count(),1);
    assert.equal(await page.locator('#paper .labels article:has(small:text-is("Математика"))').count(),3);
    assert.equal(await page.locator('#paper .labels article:has(small:text-is("Тетрадь"))').count(),0);
    assert.equal(await page.locator('#print').isDisabled(),false);
    const savedItems=await page.locator('#f-subjects').inputValue();
    await page.locator('#saved-section').evaluate(el=>{el.open=true});
    await page.locator('#saved-name').fill('Мой школьный комплект');
    await page.locator('#saved-save').click();
    await page.reload();
    await page.locator('#saved-section summary').click();
    await page.locator('.saved-item').filter({hasText:'Мой школьный комплект'}).locator('.saved-open').click();
    assert.equal(await page.locator('#f-kit').inputValue(),'Школьный комплект');
    assert.equal(await page.locator('#f-name').inputValue(),'Мария Соколова');
    assert.equal(await page.locator('#f-subjects').inputValue(),savedItems,'saved kit restores all subject quantities');

    // UI regression from user screenshot: generic .field input styles must not expand checkboxes
    // or push school subjects into letter-by-letter wrapping.
    async function checkSchoolPickerLayout(viewport){
      await page.setViewportSize({width:viewport,height:900});
      const metrics=await page.evaluate(()=>{
        const row=[...document.querySelectorAll('.school-subject-row')].find(x=>x.textContent.includes('Математика'));
        const checkbox=row.querySelector('.school-subject-check');
        const name=row.querySelector('.school-subject-name span');
        const qty=row.querySelector('.school-subject-qty input');
        const button=row.querySelector('.school-subject-remove');
        const input=document.querySelector('.school-add-actions input');
        const add=document.querySelector('.school-add-actions button');
        const b=el=>el.getBoundingClientRect();
        const r=b(row),c=b(checkbox),n=b(name),q=b(qty),d=b(button),i=b(input),a=b(add);
        return {
          rowWidth:r.width, checkboxWidth:c.width, checkboxHeight:c.height,
          checkboxMargin:getComputedStyle(checkbox).marginTop,
          nameWidth:n.width,nameHeight:n.height,
          nameLineHeight:parseFloat(getComputedStyle(name).lineHeight),
          checkboxRight:c.right,nameLeft:n.left,nameRight:n.right,qtyLeft:q.left,
          qtyWidth:q.width,qtyCenterY:(q.top+q.bottom)/2,
          nameCenterY:(n.top+n.bottom)/2,
          removeRight:d.right,
          addInputY:i.top,addButtonY:a.top,
          overflow:document.documentElement.scrollWidth-innerWidth
        };
      });
      assert.ok(metrics.checkboxWidth>=16&&metrics.checkboxWidth<=20,'compact checkbox '+JSON.stringify(metrics));
      assert.ok(metrics.checkboxHeight>=16&&metrics.checkboxHeight<=20,'compact checkbox height');
      assert.equal(metrics.checkboxMargin,'0px','checkbox does not inherit generic text-input margin');
      assert.ok(metrics.nameWidth>=69,'subject name keeps enough width '+JSON.stringify(metrics));
      assert.ok(metrics.nameHeight<=metrics.nameLineHeight+3,'Математика stays on one line '+JSON.stringify(metrics));
      assert.ok(metrics.checkboxRight<metrics.nameLeft && metrics.nameRight<=metrics.qtyLeft+1,
        'name is between checkbox and quantity '+JSON.stringify(metrics));
      assert.ok(metrics.qtyWidth>=46&&metrics.qtyWidth<=56,'numeric field remains compact '+JSON.stringify(metrics));
      assert.ok(Math.abs(metrics.qtyCenterY-metrics.nameCenterY)<=3,
        'subject and number are vertically aligned '+JSON.stringify(metrics));
      assert.ok(Math.abs(metrics.addInputY-metrics.addButtonY)<=1,'Add field and button align');
      assert.ok(metrics.overflow<=3,'picker fits viewport '+JSON.stringify(metrics));
      return metrics;
    }
    await mkdir('artifacts/ui',{recursive:true});
    await checkSchoolPickerLayout(1440);
    await page.locator('.school-picker').screenshot({
      path:'artifacts/ui/school-picker-desktop.png',animations:'disabled'
    });
    await checkSchoolPickerLayout(390);
    await page.locator('.school-picker').screenshot({
      path:'artifacts/ui/school-picker-mobile.png',animations:'disabled'
    });
    await checkSchoolPickerLayout(320);
    await page.locator('.school-picker').screenshot({
      path:'artifacts/ui/school-picker-narrow.png',animations:'disabled'
    });
    await page.setViewportSize({width:1440,height:900});
    for(const [size,pages] of [
      ['Стандартные 54 × 38 мм',1],['Маленькие 40 × 22 мм',1],['Крупные 80 × 48 мм',2]
    ]){
      await page.locator('#f-size').selectOption({label:size});
      await page.emulateMedia({media:'print'});
      const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
      const info=execFileSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
      assert.equal(Number(info.match(/^Pages:\s+(\d+)/m)?.[1]),pages,'A4 PDF page count for '+size);
      const clipped=await page.locator('#paper .labels article').evaluateAll(els=>els.filter(el=>
        el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2).length);
      assert.equal(clipped,0,'school kit stickers must not clip at '+size);
      if(size.startsWith('Стандартные')){
        await mkdir('artifacts/ui',{recursive:true});
        await page.locator('#paper .sheet-page').first().screenshot({
          path:'artifacts/ui/school-kit-a4.png',animations:'disabled'
        });
      }
      await page.emulateMedia({media:'screen'});
    }
    // An empty selection must block print, rather than output an empty label page.
    for(const box of await page.locator('#school-subject-list .school-subject-check').all()){
      if(await box.isChecked())await box.uncheck();
    }
    await page.waitForFunction(()=>{
      const items=JSON.parse(document.querySelector('#f-subjects').value);
      return items.every(item=>!item.selected) && document.querySelector('#print').disabled;
    });
    assert.equal(await page.locator('#print').isDisabled(),true,'cannot print an empty school kit');
    assert.match(await page.locator('#print-status').innerText(),/Выберите хотя бы один предмет/);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),
      'school subject list fits mobile screen');
    await page.setViewportSize({width:1440,height:900});
    console.log('PASS school kit: subjects, quantities, saved project and 3 A4 sizes');
  }catch(error){
    failed=true;
    console.error('FAIL school subject kit',error);
    await page.emulateMedia({media:'screen'});
    await page.setViewportSize({width:1440,height:900});
  }
  // A shared label or school kit for siblings, without overwriting the single-child mode.
  try {
    await page.locator('[data-tab="labels"]').click();
    await page.locator('#reset').click();
    await page.locator('#f-name').fill('Мария Соколова');
    await page.locator('#f-name').dispatchEvent('change');
    await page.locator('#f-kit').selectOption({label:'Школьный комплект'});
    await page.locator('#f-audience').selectOption({label:'Несколько детей'});
    assert.equal(await page.locator('[data-field-id="name"]').isVisible(),false);
    assert.equal(await page.locator('[data-field-id="names"]').isVisible(),true);
    assert.equal(await page.locator('#f-names').inputValue(),'Мария Соколова',
      'first child is carried over without adding another child automatically');
    await page.locator('#f-names').fill('Мария Соколова\nМатвей Соколов');
    await page.waitForFunction(()=>document.querySelectorAll('#paper .labels article').length===24);
    assert.equal(await page.locator('#paper .labels article:has(b:text-is("Мария Соколова"))').count(),12);
    assert.equal(await page.locator('#paper .labels article:has(b:text-is("Матвей Соколов"))').count(),12);
    assert.match(await page.locator('#family-summary').innerText(),/2 ребёнка · 24 наклеек/);
    await mkdir('artifacts/ui',{recursive:true});
    await page.locator('[data-field-id="names"]').screenshot({
      path:'artifacts/ui/family-names-desktop.png',animations:'disabled'
    });
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),
      'family names form fits mobile width');
    await page.locator('[data-field-id="names"]').screenshot({
      path:'artifacts/ui/family-names-mobile.png',animations:'disabled'
    });
    await page.setViewportSize({width:1440,height:900});
    for(const [size,expectedPages] of [
      ['Стандартные 54 × 38 мм',2],['Маленькие 40 × 22 мм',1],
      ['Крупные 80 × 48 мм',3]
    ]){
      await page.locator('#f-size').selectOption({label:size});
      await page.emulateMedia({media:'print'});
      const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
      const info=execFileSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
      assert.equal(Number(info.match(/^Pages:\s+(\d+)/m)?.[1]),expectedPages,'family PDF page count: '+size);
      assert.equal(await page.locator('#paper .labels article').count(),24);
      const clipped=await page.locator('#paper .labels article').evaluateAll(els=>els.filter(el=>
        el.scrollWidth>el.clientWidth+3||el.scrollHeight>el.clientHeight+3).length);
      assert.equal(clipped,0,'family labels fit '+size);
      if(size.startsWith('Стандартные'))await page.locator('#paper .sheet-page').first().screenshot({
        path:'artifacts/ui/family-labels-a4.png',animations:'disabled'
      });
      await page.emulateMedia({media:'screen'});
    }
    await page.locator('#saved-section').evaluate(el=>{el.open=true});
    await page.locator('#saved-name').fill('Наклейки для семьи');
    await page.locator('#saved-save').click();
    await page.reload();
    await page.locator('#saved-section').evaluate(el=>{el.open=true});
    await page.locator('.saved-item').filter({hasText:'Наклейки для семьи'}).locator('.saved-open').click();
    assert.equal(await page.locator('#f-audience').inputValue(),'Несколько детей');
    assert.equal(await page.locator('#f-names').inputValue(),'Мария Соколова\nМатвей Соколов');
    assert.equal(await page.locator('#paper .labels article').count(),24,'saved family restores both groups');
    await page.locator('#f-kit').selectOption({label:'Одинаковые'});
    await page.locator('#f-count').fill('49');
    await page.locator('#f-count').dispatchEvent('change');
    await page.waitForFunction(()=>document.querySelector('#print').disabled);
    assert.match(await page.locator('#print-status').innerText(),/не более 96 наклеек/);
    await page.locator('#f-count').fill('2');
    await page.locator('#f-count').dispatchEvent('change');
    await page.waitForFunction(()=>!document.querySelector('#print').disabled);
    assert.equal(await page.locator('#paper .labels article').count(),4);
    await page.locator('#f-names').fill('Маша\nМатвей\nЛиза\nАня\nИван\nПетя\nИлья');
    await page.waitForFunction(()=>document.querySelector('#print').disabled);
    assert.match(await page.locator('#print-status').innerText(),/не более 6 детей/);
    console.log('PASS family labels: two children, three A4 sizes, saved projects and limits');
  } catch(error){
    failed=true;
    console.error('FAIL family labels',error);
    await page.emulateMedia({media:'screen'});
    await page.setViewportSize({width:1440,height:900});
  }
} finally {
  await finishVisualReport();
  await browser.close();
}
if(failed)process.exitCode=1;
