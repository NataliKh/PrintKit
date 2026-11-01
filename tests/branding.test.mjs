import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const modes=['math','cards','labels','diploma','schedule','habits'];
const publicPages=['index.html',...modes.map(mode=>'tools/'+mode+'/index.html')];

test('all public pages use Listokia branding, canonical URLs and their real URLs',()=>{
 for(const path of publicPages){
  const source=read(path);
  const url='https://listokia.ru/'+(path==='index.html'?'':path.replace(/index\.html$/,''));
  assert.match(source,/Листокия|Листо<span class="brand-accent">кия/,'visible Listokia name: '+path);
  assert.ok(source.includes('<link rel="canonical" href="'+url+'">'),'canonical: '+path);
  assert.ok(source.includes('<meta property="og:url" content="'+url+'">'),'Open Graph URL: '+path);
  assert.ok(source.includes('favicon.svg'),'favicon: '+path);
  assert.ok(!source.includes('https://natalikh.github.io/PrintKit/'),'no old public origin: '+path);
 }
});

test('sitemap and robots point only to the new domain and all seven indexable pages',()=>{
 const sitemap=read('sitemap.xml');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
 assert.equal(urls.length,7);
 assert.deepEqual(urls,['https://listokia.ru/',...modes.map(mode=>'https://listokia.ru/tools/'+mode+'/')]);
 const robots=read('robots.txt');
 assert.match(robots,/^User-agent: \*$/m);
 assert.match(robots,/^Sitemap: https:\/\/listokia\.ru\/sitemap\.xml$/m);
 assert.match(read('favicon.svg'),/<svg\b/);
});

test('legal texts keep the historical MIT PrintKit name and new public name',()=>{
 const legal=read('legal.html');
 assert.match(legal,/>Условия использования Листокии</);
 assert.match(legal,/под названием PrintKit до коммита 8d018043/);
 assert.match(read('privacy.html'),/Листокия работает в браузере/);
});

test('consent gating remains intact and migration does not rename local storage',()=>{
 const analytics=read('analytics.js');
 assert.match(analytics,/const METRIKA_ID=113974859/);
 assert.match(analytics,/CONSENT_KEY="printkit\.analytics\.consent\.v1"/);
 assert.match(analytics,/Помогите улучшать Листокию/);
 assert.match(read('saved-kits.js'),/printkit\.saved\.v1/);
});
