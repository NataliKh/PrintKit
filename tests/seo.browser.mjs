import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=new URL('../',import.meta.url);
const modes=['math','cards','labels','diploma','schedule','habits'];
const defaultKits={math:'brackets',cards:'animals',labels:'notebooks',diploma:'effort',schedule:'school',habits:'healthy'};
const manifest=JSON.parse(await readFile(new URL('../previews/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.previews.length,25,'exactly 25 real A4 previews');
assert.equal(new Set(manifest.previews.map(x=>x.file)).size,25,'unique previews');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 for(const mode of modes){
  await page.goto(new URL('tools/'+mode+'/index.html',base).href);
  assert.match(await page.title(),/PrintKit/);
  assert.equal(await page.locator('h1').count(),1,'one indexable main heading for '+mode);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://natalikh.github.io/PrintKit/tools/'+mode+'/');
  const image=page.locator('.seo-preview img');
  await image.waitFor();
  const details=await image.evaluate(el=>({ok:el.complete&&el.naturalWidth>200,src:el.getAttribute('src')}));
  assert.ok(details.ok,'real A4 preview loads in '+mode+': '+JSON.stringify(details));
  await page.locator('a.seo-primary').click();
  await page.locator('#starter-grid [data-starter="'+defaultKits[mode]+'"]').waitFor();
  assert.equal(await page.locator('[data-tab="'+mode+'"]').getAttribute('aria-current'),'true','deep-link generator '+mode);
  assert.equal(await page.locator('#starter-grid [data-starter="'+defaultKits[mode]+'"]').getAttribute('aria-pressed'),'true','deep-link kit '+mode);
  assert.equal(await page.locator('#print').isDisabled(),false,'landing page produces printable document '+mode);
  console.log('SEO PASS',mode);
 }
 await page.goto(new URL('index.html',base).href);
 const thumbs=page.locator('#catalog-grid img.catalog-real-preview');
 assert.equal(await thumbs.count(),6,'six featured template thumbnails');
 for(const item of await thumbs.all()){
  const ok=await item.evaluate(el=>el.complete&&el.naturalWidth>200&&!el.hidden);
  assert.ok(ok,'featured catalog has a real A4 thumbnail');
 }
 await page.locator('#catalog-more').click();
 assert.equal(await page.locator('#catalog-grid img.catalog-real-preview').count(),25,'all previews linked from catalog');
 for(const item of await page.locator('#catalog-grid img.catalog-real-preview').all()){
  await item.scrollIntoViewIfNeeded();
  assert.ok(await item.evaluate(el=>el.complete&&el.naturalWidth>200&&!el.hidden),'gallery image missing');
 }
 console.log('SEO PASS catalog image coverage and routes');
}finally{
 await browser.close();
}
