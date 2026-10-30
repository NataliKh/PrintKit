import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const url = new URL('../index.html', import.meta.url).href;
const browser = await chromium.launch({headless: true});
const scenarios = [
  {name:'math and answers',mode:'math',fields:{count:'40',key:'Да'},pages:3},
  {name:'40 flashcards',mode:'cards',fields:{items:Array.from({length:40},(_,i)=>'Слово '+i+' — перевод '+i).join('\n')},pages:5},
  {name:'27 standard labels',mode:'labels',fields:{count:'27'},pages:3},
  {name:'27 small labels',mode:'labels',fields:{count:'27',size:'Маленькие 40 × 22 мм'},pages:1},
  {name:'27 large labels',mode:'labels',fields:{count:'27',size:'Крупные 80 × 48 мм'},pages:4},
  {name:'31-day tracker',mode:'habits',fields:{month:'Октябрь',year:'2026',items:Array.from({length:15},(_,i)=>'Привычка '+i).join('\n')},pages:3},
  {name:'children award',mode:'diploma',fields:{layout:'Детский',name:'Анна Иванова'},pages:1}
];
let failed = false;
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(url);
  for (const scenario of scenarios) {
    try {
      await page.locator('[data-tab="'+scenario.mode+'"]').click();
      for (const [key,value] of Object.entries(scenario.fields)) {
        const element=page.locator('#f-'+key);
        if(await element.evaluate(el=>el.tagName)==='SELECT') await element.selectOption({label:value});
        else await element.fill(value);
        await element.dispatchEvent('change');
      }
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
      assert.match(info,/Page size:\s+595(?:\.\d+)? x 842(?:\.\d+)? pts/);
      await page.emulateMedia({media:'screen'});
      console.log('PASS',scenario.name,actualPages,'PDF pages');
    } catch(error) {
      failed=true;
      console.error('FAIL',scenario.name,error);
      await page.emulateMedia({media:'screen'});
    }
  }
} finally {
  await browser.close();
}
if(failed)process.exitCode=1;
