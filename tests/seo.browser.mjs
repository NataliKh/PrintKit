import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=new URL('../',import.meta.url);
const modes=['math','writing','cards','labels','diploma','schedule','habits'];
const defaultKits={math:'brackets',writing:'digits',cards:'animals',labels:'notebooks',diploma:'effort',schedule:'school',habits:'healthy'};
const manifest=JSON.parse(await readFile(new URL('../previews/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.previews.length,42,'exactly 42 real A4 previews');
assert.equal(new Set(manifest.previews.map(x=>x.file)).size,42,'unique previews');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 for(const mode of modes){
  await page.goto(new URL('tools/'+mode+'/index.html',base).href);
  assert.match(await page.title(),/Листокия/);
  assert.equal(await page.locator('h1').count(),1,'one indexable main heading for '+mode);
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://listokia.ru/tools/'+mode+'/');
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
 await page.goto(new URL('tools/print-check/index.html',base).href);
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://listokia.ru/tools/print-check/');
 assert.equal(await page.locator('h1').count(),1,'one accessible print calibration heading');
 assert.equal(await page.locator('#paper .calibration-page').count(),1,'calibration loads by default');
 await page.goto(new URL('index.html',base).href);
 assert.equal(await page.locator('a[href="./tools/print-check/"]').count(),2,'visible print-check entry points');
 assert.equal(await page.locator('.guide-links a[href="./tools/writing/"]').count(),1,'indexable digit tracing guide linked from home');
 assert.ok((await readFile(new URL('../tools/writing/index.html',import.meta.url),'utf8')).includes('Рукописные русские буквы, слоги и соединения временно недоступны'),
  'new guide must explain the unavailable handwritten letter modes');
 assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://listokia.ru/');
 assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'),'https://listokia.ru/');
 assert.equal(await page.locator('link[rel=icon]').getAttribute('href'),'./favicon.svg');
 const thumbs=page.locator('#catalog-grid img.catalog-real-preview');
 assert.equal(await thumbs.count(),7,'seven featured template thumbnails');
 for(const item of await thumbs.all()){
  const ok=await item.evaluate(el=>el.complete&&el.naturalWidth>200&&!el.hidden);
  assert.ok(ok,'featured catalog has a real A4 thumbnail');
 }
 await page.locator('#catalog-more').click();
 assert.equal(await page.locator('#catalog-grid img.catalog-real-preview').count(),42,'all previews linked from catalog');
 for(const item of await page.locator('#catalog-grid img.catalog-real-preview').all()){
  await item.scrollIntoViewIfNeeded();
  assert.ok(await item.evaluate(el=>el.complete&&el.naturalWidth>200&&!el.hidden),'gallery image missing');
 }
 console.log('SEO PASS catalog image coverage and routes');
 for(const name of ['legal.html','privacy.html']){
  await page.goto(new URL(name,base).href);
  assert.equal(await page.locator('h1').count(),1,'legal content has an accessible heading: '+name);
  assert.ok((await page.title()).includes('Листокия'));
  assert.equal(await page.locator('a[href*="index.html#editor"]').count(),1,'navigation back to editor');
 }
 await page.goto(new URL('index.html',base).href);
 // A visit must not load Yandex until the visitor explicitly opts in.
 await page.route('https://mc.yandex.ru/**',route=>route.abort());
 assert.ok(await page.evaluate(()=>window.printKitAnalytics?.enabled()===true),'real Listokia counter is configured');
 assert.equal(await page.locator('.pk-consent').count(),1,'consent banner shown for first-time visitor');
 assert.equal(await page.locator('script[src^="https://mc.yandex.ru/metrika/tag.js"]').count(),0,
  'no tracking script before consent');
 await page.locator('.pk-consent button').filter({hasText:'Разрешить'}).click();
 assert.equal(await page.locator('script[src="https://mc.yandex.ru/metrika/tag.js?id=113974859"]').count(),1,
  'exactly the configured counter loads after consent');
 assert.equal(await page.evaluate(()=>localStorage.getItem('printkit.analytics.consent.v1')),'yes');
 await page.reload();
 assert.equal(await page.locator('.pk-consent').count(),0,'consent is remembered');
 await page.locator('[data-open-analytics-settings]').click();
 await page.locator('.pk-consent button').filter({hasText:'Без статистики'}).click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('printkit.analytics.consent.v1')),'no');
 assert.equal(await page.locator('script[src^="https://mc.yandex.ru/metrika/tag.js"]').count(),0,
  'revoking consent stops subsequent tracking after reload');
 assert.equal(await page.locator('a[href="./legal.html"]').count(),1);
 assert.equal(await page.locator('a[href="./privacy.html"]').count(),1);
 console.log('SEO PASS copyright pages, consent-first Yandex Metrica activation and withdrawal');
}finally{
 await browser.close();
}
