import {mkdir, readFile, writeFile, copyFile, access} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';

const outputDir=resolve('artifacts/printkit-visual');
const baselineDir=process.env.PRINTKIT_VISUAL_BASELINE
  ?resolve(process.env.PRINTKIT_VISUAL_BASELINE):null;
const report=[];

async function exists(file){
  try{await access(file);return true}catch{return false}
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function captureVisual(id,name,page,pdf,expectedPages){
  if(!/^[a-z0-9-]+$/.test(id))throw new Error('Invalid scenario id: '+id);
  const folder=join(outputDir,id);
  await mkdir(folder,{recursive:true});
  await writeFile(join(folder,'sample.pdf'),pdf);
  const pages=await page.locator('.sheet-page').count();
  const entry={id,name,pages,expectedPages,images:[]};
  for(let i=0;i<pages;i++){
    const filename='page-'+(i+1)+'.png';
    const imagePath=join(folder,filename);
    await page.locator('.sheet-page').nth(i).screenshot({
      path:imagePath,animations:'disabled',scale:'css'
    });
    const img={file:filename,baseline:null,diff:null,changePercent:null,status:'new'};
    const oldPath=baselineDir?join(baselineDir,id,filename):null;
    if(oldPath&&await exists(oldPath)){
      const before=PNG.sync.read(await readFile(oldPath));
      const after=PNG.sync.read(await readFile(imagePath));
      const oldName='baseline-'+filename;
      await copyFile(oldPath,join(folder,oldName));
      img.baseline=oldName;
      if(before.width===after.width&&before.height===after.height){
        const diff=new PNG({width:after.width,height:after.height});
        const changed=pixelmatch(before.data,after.data,diff.data,
          after.width,after.height,{threshold:0.12,includeAA:false});
        img.changePercent=Number((changed/(after.width*after.height)*100).toFixed(3));
        img.status=changed===0?'unchanged':'changed';
        if(changed){
          img.diff='diff-'+filename;
          await writeFile(join(folder,img.diff),PNG.sync.write(diff));
        }
      }else{
        img.status='different dimensions';
      }
    }
    entry.images.push(img);
  }
  report.push(entry);
  return entry;
}

export async function finishVisualReport(){
  await mkdir(outputDir,{recursive:true});
  const hasBaseline=Boolean(baselineDir&&await exists(join(baselineDir,'manifest.json')));
  const manifest={generatedAt:new Date().toISOString(),hasBaseline,scenarios:report};
  await writeFile(join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const sections=report.map(s=>{
    const previews=s.images.map((x,i)=>{
      const base=s.id+'/';
      const before=x.baseline
        ?'<figure><img loading="lazy" src="'+base+x.baseline+'"><figcaption>Предыдущая версия</figcaption></figure>':'';
      const diff=x.diff
        ?'<figure><img loading="lazy" src="'+base+x.diff+'"><figcaption>Разница</figcaption></figure>':'';
      const detail=x.changePercent===null?x.status:(x.changePercent+'% пикселей изменено');
      return '<h3>Страница '+(i+1)+' · '+esc(detail)+'</h3><div class="row">'+before+
        '<figure><img loading="lazy" src="'+base+x.file+'"><figcaption>Текущая версия</figcaption></figure>'+diff+'</div>';
    }).join('');
    return '<section><h2>'+esc(s.name)+'</h2><p>'+s.pages+' стр. · <a href="'+s.id+'/sample.pdf">Открыть PDF</a></p>'+previews+'</section>';
  }).join('');
  const html='<!doctype html><html lang="ru"><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>PrintKit · визуальные тесты</title>'+
    '<style>body{font-family:Arial,sans-serif;background:#f6f5fa;color:#24213b;margin:0 auto;padding:30px;max-width:1200px}'+
    'h1{margin-bottom:7px}section{background:white;border-radius:14px;padding:22px;margin:24px 0;box-shadow:0 4px 20px #2020400e}'+
    '.row{display:flex;gap:15px;flex-wrap:wrap;align-items:start}figure{margin:0;flex:1 1 260px;max-width:360px}'+
    'img{width:100%;height:auto;border:1px solid #ddd;box-shadow:0 5px 15px #0001}figcaption{font-size:13px;color:#666;padding:9px 0}'+
    'a{color:#6a4cc3}</style><h1>PrintKit · визуальный отчёт</h1>'+
    '<p>'+ (hasBaseline?'Сравнение с последней версией main.':'Базовой версии пока нет — создан набор эталонных изображений.')+
    ' Различия носят информационный характер; тесты размеров и переполнения остаются обязательными.</p>'+
    sections+'</html>';
  await writeFile(join(outputDir,'index.html'),html);
  const rows=report.map(s=>{
    const changes=s.images.filter(i=>i.status==='changed'||i.status==='different dimensions').length;
    return '| '+s.name+' | '+s.pages+' | '+(hasBaseline?changes+' из '+s.pages:'эталон создан')+' |';
  }).join('\n');
  const markdown='### PrintKit · PDF и визуальные снимки\n\n'+
    '| Сценарий | Страниц PDF | Изменения изображений |\n| --- | ---: | --- |\n'+rows+'\n\n'+
    'Артефакт **printkit-visual** содержит PDF, PNG страниц, отчёт `index.html` и разностные изображения при наличии предыдущей версии.\n';
  if(process.env.GITHUB_STEP_SUMMARY){
    await writeFile(process.env.GITHUB_STEP_SUMMARY,markdown,{flag:'a'});
  }
  console.log(markdown);
}
