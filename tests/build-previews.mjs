import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const out=new URL('../previews/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
let failures=0;
const manifest=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await page.goto(new URL('../index.html',import.meta.url).href);
 const entries=await page.evaluate(()=>Object.entries(starterKits).flatMap(([mode,kits])=>kits.map(kit=>({mode,id:kit.id,title:kit.title}))));
 assert.equal(entries.length,24,'all catalog templates must have real previews');
 for(const {mode,id,title} of entries){
  try{
   await page.emulateMedia({media:'screen'});
   await page.locator('[data-tab="'+mode+'"]').click();
   await page.locator('#reset').click();
   await page.evaluate(()=>{
    let seed=0xC0FFEE;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   });
   await page.locator('#starter-grid [data-starter="'+id+'"]').click();
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>!document.getElementById('print').disabled);
   await page.emulateMedia({media:'print'});
   const sheet=page.locator('#paper .sheet-page').first();
   // CSS zoom produces a faithful low-resolution print-media raster of the real A4 page.
   await sheet.evaluate(element=>{element.style.zoom='0.42';});
   const box=await sheet.boundingBox();
   assert.ok(box&&box.width>280&&box.width<390&&box.height>390&&box.height<520,
    'thumbnail geometry '+JSON.stringify(box));
   const filename=mode+'-'+id+'.jpg';
   const data=await sheet.screenshot({type:'jpeg',quality:77,animations:'disabled',scale:'css'});
   assert.ok(data.byteLength>1500,'empty thumbnail '+filename);
   await writeFile(new URL(filename,out),data);
   manifest.push({mode,id,title,file:filename,bytes:data.byteLength,width:Math.round(box.width),height:Math.round(box.height)});
   console.log('PREVIEW',filename,box.width.toFixed(0)+'x'+box.height.toFixed(0),data.byteLength+' bytes');
  }catch(error){
   failures++;
   console.error('PREVIEW FAIL',mode,id,error);
  }
 }
}finally{
 await browser.close();
}
await writeFile(new URL('manifest.json',out),JSON.stringify({generatedAt:new Date().toISOString(),previews:manifest},null,2)+'\n');
assert.equal(failures,0,'all thumbnails must render');
assert.equal(manifest.length,24,'all 24 thumbnails must be built');
