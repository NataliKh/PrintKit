import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {chromium,firefox} from 'playwright';
const url=new URL('../tools/print-check/index.html',import.meta.url).href;
const specs={standard:[4,2],large:[2,2],compact:[4,3]};
const mm=96/25.4;
let failed=false;
for(const [engine,browserType] of [['chromium',chromium],['firefox',firefox]]){
 const browser=await browserType.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(url);
  assert.equal(await page.locator('#paper .calibration-page').count(),1);
  await page.emulateMedia({media:'print'});
  const ruler=await page.evaluate(()=>{
   const rect=selector=>document.querySelector(selector).getBoundingClientRect();
   return {
    page:[rect('#paper .sheet-page').width,rect('#paper .sheet-page').height],
    ruler:rect('.calibration-ruler').width,
    square:[rect('.calibration-square').width,rect('.calibration-square').height],
    controls:getComputedStyle(document.querySelector('.check-panel')).display
   };
  });
  assert.ok(Math.abs(ruler.page[0]/mm-210)<0.5&&Math.abs(ruler.page[1]/mm-297)<0.5,engine+' A4 geometry');
  assert.ok(Math.abs(ruler.ruler/mm-100)<0.5,engine+' 100mm rule');
  assert.ok(ruler.square.every(n=>Math.abs(n/mm-50)<0.5),engine+' 50mm square');
  assert.equal(ruler.controls,'none','settings must not print');
  if(engine==='chromium'){
   const info=execFileSync('pdfinfo',['-'],{input:await page.pdf({preferCSSPageSize:true}),encoding:'utf8'});
   assert.equal(Number(info.match(/^Pages:\s+(\d+)/m)?.[1]),1,'calibration PDF single A4');
  }
  await page.emulateMedia({media:'screen'});
  for(const [size,[rows,cols]] of Object.entries(specs)){
   for(const flip of ['long','short']){
    await page.locator('input[value="duplex"]').check();
    await page.locator('#check-size').selectOption(size);
    await page.locator('#check-flip').selectOption(flip);
    const slots=rows*cols;
    assert.equal(await page.locator('#paper .cards-page').count(),2);
    assert.equal(await page.locator('#paper article[data-card-side="front"]').count(),slots);
    assert.equal(await page.locator('#paper article[data-card-side="back"]').count(),slots);
    const order=await page.locator('.cards-page--back article[data-card-index]').evaluateAll(els=>els.map(el=>Number(el.dataset.cardIndex)));
    const expected=Array.from({length:slots},(_,i)=>{
     const r=Math.floor(i/cols),c=i%cols;
     return flip==='short'?(rows-1-r)*cols+c:r*cols+(cols-1-c);
    });
    assert.deepEqual(order,expected,engine+' '+size+' '+flip+' back mirror');
    const backs=await page.locator('.cards-page--back article b').allTextContents();
    assert.deepEqual(backs,expected.map(i=>'ОБОРОТ '+(i+1)),'correct pair labels');
    await page.emulateMedia({media:'print'});
    const geometries=await page.locator('#paper .cards-page').evaluateAll(pages=>pages.map(p=>{
     const rect=p.getBoundingClientRect();
     const clipped=[...p.querySelectorAll('*')].filter(el=>{
      const r=el.getBoundingClientRect();
      return r.width>0&&r.height>0&&(r.left<rect.left-2||r.right>rect.right+2||r.top<rect.top-2||r.bottom>rect.bottom+2);
     });
     return {w:rect.width,h:rect.height,clipped:clipped.slice(0,3).map(el=>el.tagName)};
    }));
    assert.ok(geometries.every(p=>Math.abs(p.w/mm-210)<0.5&&Math.abs(p.h/mm-297)<0.5&&!p.clipped.length),
     engine+' '+size+' '+flip+' A4 clipping '+JSON.stringify(geometries));

  // Crosses must be symmetric and co-located in the printed margins on both faces.
  const targetRects=await page.locator('#paper .cards-page').evaluateAll(sheets=>sheets.map(sheet=>{
   const page=sheet.getBoundingClientRect();
   return [...sheet.querySelectorAll('.check-target')].map(el=>{
    const r=el.getBoundingClientRect();
    return {x:r.left-page.left,y:r.top-page.top,w:r.width,h:r.height};
   });
  }));
  assert.equal(targetRects.length,2,engine+' has two sheets with registration targets');
  for(const [side,markers] of targetRects.entries()){
   assert.equal(markers.length,4,engine+' four corner marks on side '+side);
   assert.ok(markers.every(m=>Math.abs(m.w/mm-6)<0.25&&Math.abs(m.h/mm-6)<0.25),
    engine+' 6mm cross dimensions');
   const left=10*mm,right=(210-16)*mm,top=10*mm,bottom=(297-16)*mm;
   for(const [i,m] of markers.entries()){
    assert.ok(Math.abs(m.x-(i%2?right:left))<1.5&&Math.abs(m.y-(i>=2?bottom:top))<1.5,
     engine+' print alignment cross '+i+' '+JSON.stringify(m));
   }
  }
  assert.deepEqual(targetRects[0],targetRects[1],engine+' front/back print register marks coincide');
    if(engine==='chromium'){
     const info=execFileSync('pdfinfo',['-'],{input:await page.pdf({preferCSSPageSize:true}),encoding:'utf8'});
     assert.equal(Number(info.match(/^Pages:\s+(\d+)/m)?.[1]),2,'two-page duplex PDF');
    }
    await page.emulateMedia({media:'screen'});
    console.log('PASS '+engine+' physical kit '+size+' '+flip);
   }
  }
  await page.locator('input[value="scale"]').check();
  assert.equal(await page.locator('#paper .sheet-page').count(),1,'return to calibration');
  await page.locator('#check-ruler-measured').fill('98.5');
  await page.locator('#check-square-width').fill('50');
  await page.locator('#check-square-height').fill('50');
  assert.match(await page.locator('#check-measure-result').innerText(),/1,5 мм/,'scale discrepancy is measured, not guessed');
  await page.locator('#check-ruler-measured').fill('100');
  assert.match(await page.locator('#check-measure-result').innerText(),/Масштаб близок/,'good calibration report');
  await page.locator('input[value="duplex"]').check();
  await page.locator('#check-offset-x').fill('2');
  await page.locator('#check-offset-y').fill('0.5');
  assert.match(await page.locator('#check-measure-result').innerText(),/2,0 мм/,'duplex offset is reported');
  assert.equal(await page.locator('#paper .check-target').count(),8,'cross targets remain in preview');
  await page.close();
 }catch(err){failed=true;console.error('FAIL physical print kit '+engine,err);}
 finally{await browser.close();}
}
if(failed)process.exitCode=1;
