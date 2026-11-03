// All arithmetic stays local. Numeric answers stay inside the chosen range;
// comparison exercises have a symbolic answer: <, > or =.
const mathTopicsByGrade={
 '1 класс':['По программе класса','Сложение и вычитание','Пропущенное число','Сравнение чисел','Состав числа','Текстовые задачи'],
 '2 класс':['По программе класса','Сложение и вычитание','Переход через десяток','Пропущенное число','Сравнение чисел','Состав числа','Текстовые задачи'],
 '3 класс':['По программе класса','Таблица умножения','Деление без остатка','Сложение и вычитание'],
 '4 класс':['По программе класса','Умножение и деление','Порядок действий','Сложение и вычитание'],
 '5 класс':['По программе класса','Доли числа','Умножение и деление','Порядок действий']
};

/**
 * Balanced first-grade practice for the default "По программе класса" topic.
 * Build finite pools instead of relying on repeated random attempts; dedicated
 * subjects still include zero exercises for focused practice.
 */
function mathFirstGradeMixed(maximum,total){
 const pools={addition:[],subtraction:[],missing:[]};
 for(let sum=0;sum<=maximum;sum++){
  for(let a=0;a<=sum;a++){
   const b=sum-a;
   const family=Math.min(a,b)+':'+Math.max(a,b);
   const trivial=a===0||b===0;
   pools.addition.push({text:a+' + '+b,answer:sum,family,trivial});
   pools.subtraction.push({text:sum+' − '+b,answer:a,family,trivial});
   pools.missing.push({text:'□ + '+b+' = '+sum,answer:a,blank:true,family,trivial});
   pools.missing.push({text:b+' + □ = '+sum,answer:a,blank:true,family,trivial});
   pools.missing.push({text:sum+' − □ = '+b,answer:a,blank:true,family,trivial});
   pools.missing.push({text:sum+' − '+b+' = □',answer:a,blank:true,family,trivial});
  }
 }
 const quotas={
  addition:Math.round(total*0.35),
  subtraction:Math.round(total*0.35),
  missing:total-2*Math.round(total*0.35)
 };
 const order=[];
 while(order.length<total){
  for(const kind of ['addition','subtraction','missing']){
   if(quotas[kind]>0){order.push(kind);quotas[kind]--;}
  }
 }
 for(let i=order.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [order[i],order[j]]=[order[j],order[i]];
 }
 // Keep some practice with zero, but never let it dominate the usual 20/40-task sheets.
 const zeroSlots=new Set();
 const simpleSlots=order.map((kind,i)=>kind==='missing'?-1:i).filter(i=>i!==-1);
 for(let n=0;n<Math.min(2,Math.floor(total/20))&&simpleSlots.length;n++){
  const index=Math.floor(Math.random()*simpleSlots.length);
  zeroSlots.add(simpleSlots.splice(index,1)[0]);
 }
 const usedTexts=new Set(),usedFamilies=new Set(),results=[];
 const kinds=['addition','subtraction','missing'];
 function take(fromKinds,allowTrivial,newFamilyOnly){
  const choices=fromKinds.flatMap(kind=>pools[kind].filter(q=>
   !usedTexts.has(q.text)&&(allowTrivial||!q.trivial)&&(!newFamilyOnly||!usedFamilies.has(q.family))
  ));
  return choices.length?choices[Math.floor(Math.random()*choices.length)]:null;
 }
 for(let index=0;index<order.length;index++){
  const kind=order[index];
  const zeroChoices=zeroSlots.has(index)?pools[kind].filter(q=>
   q.trivial&&q.family!=='0:0'&&!usedTexts.has(q.text)&&!usedFamilies.has(q.family)
  ):[];
  const zeroQuestion=zeroChoices.length?zeroChoices[Math.floor(Math.random()*zeroChoices.length)]:null;
  // Prefer new nontrivial fact families; only repeat if the chosen range is tiny.
  const question=zeroQuestion||
   take([kind],false,true)||take([kind],false,false)||
   take(kinds,false,true)||take(kinds,false,false)||
   take([kind],true,true)||take([kind],true,false)||
   take(kinds,true,true)||take(kinds,true,false)||
   pools[kind][Math.floor(Math.random()*pools[kind].length)];
  usedTexts.add(question.text);
  usedFamilies.add(question.family);
  const {text,answer,blank}=question;
  results.push(blank?{text,answer,blank:true}:{text,answer});
 }
 return results;
}


/**
 * Balanced mixed practice in grades 2–5. Dedicated topics are untouched.
 * Finite candidate pools avoid random retry loops and permit a safe fallback
 * when a requested range has fewer unique exercises than the chosen count.
 */
function mathUpperGradeMixed(gradeIndex,maximum,total,one,transitions){
 const skills={
  1:['add','subtract','missing','transition'],
  2:['add','subtract','multiply','divide'],
  3:['add','subtract','multiply','divide','order'],
  4:['multiply','divide','order','fraction']
 }[gradeIndex];
 const topics={
  add:'Сложение и вычитание',subtract:'Сложение и вычитание',
  missing:'Пропущенное число',transition:'Переход через десяток',
  multiply:gradeIndex===2?'Таблица умножения':'Умножение и деление',
  divide:gradeIndex===2?'Деление без остатка':'Умножение и деление',
  order:'Порядок действий',fraction:'Доли числа'
 };
 const pools=Object.fromEntries(skills.map(skill=>[skill,[]]));
 for(const skill of skills){
  if(skill==='transition'&&!transitions.length)continue;
  const used=new Set();
  for(let attempt=0;attempt<300;attempt++){
   const question=one(topics[skill]);
   if(skill==='add'||skill==='subtract'){
    const operation=question.text.match(/^\d+ ([+−]) /);
    if(!operation||(skill==='add')!==(operation[1]==='+'))continue;
   }else if(skill==='multiply'||skill==='divide'){
    if((skill==='multiply')!==question.text.includes(' × '))continue;
   }
   if(used.has(question.text))continue;
   used.add(question.text);
   pools[skill].push(question);
  }
 }
 const quota=Object.fromEntries(skills.map((skill,i)=>[
  skill,Math.floor(total/skills.length)+(i<total%skills.length?1:0)
 ]));
 // For example, only 9 + 1 crosses ten when the maximum is ten.
 let spare=0;
 for(const skill of skills){
  if(quota[skill]>pools[skill].length){
   spare+=quota[skill]-pools[skill].length;
   quota[skill]=pools[skill].length;
  }
 }
 while(spare>0){
  const eligible=skills.filter(skill=>quota[skill]<pools[skill].length);
  if(!eligible.length)break;
  eligible.sort((a,b)=>quota[a]-quota[b]||pools[b].length-pools[a].length);
  quota[eligible[0]]++;
  spare--;
 }
 const sequence=skills.flatMap(skill=>Array(quota[skill]).fill(skill));
 while(sequence.length<total)sequence.push(skills[sequence.length%skills.length]);
 // Assign constrained skills first, then shuffle the resulting worksheet.
 sequence.sort((a,b)=>pools[a].length-pools[b].length);
 const usedTexts=new Set(),families=new Map(),answers=new Map(),buckets=new Map();
 const chosen=[];
 function family(q){
  const expression=q.blank?q.text.replace('□',String(q.answer)).split(' = ')[0]:q.text;
  let match=expression.match(/^(\d+) ([+×]) (\d+)$/);
  if(match)return match[2]+':'+[+match[1],+match[3]].sort((a,b)=>a-b).join(':');
  match=expression.match(/^(\d+) : (\d+)$/);
  if(match)return '×:'+[(+match[2]),q.answer].sort((a,b)=>a-b).join(':');
  match=expression.match(/^(\d+) − (\d+)$/);
  if(match)return '+:'+[(+match[2]),+match[1]-(+match[2])].sort((a,b)=>a-b).join(':');
  return expression;
 }
 function trivial(q){
  const expression=q.blank?q.text.replace('□',String(q.answer)).split(' = ')[0]:q.text;
  return /(?:^|[ (])0 (?:\+|−) |[+−] 0(?:\b|\))/u.test(expression)||
   /^(\d+) − \1$/u.test(expression)||
   /^(?:1 × \d+|\d+ (?:×|:) 1)$/u.test(expression);
 }
 function bestFrom(candidates){
  let selected=null,best=-Infinity;
  for(const q of candidates){
   if(usedTexts.has(q.text))continue;
   const fact=family(q),bucket=Math.min(4,Math.floor(q.answer*5/(maximum+1)));
   const score=-18*Number(trivial(q))-4*(families.get(fact)||0)-
    2*(answers.get(q.answer)||0)-1.5*(buckets.get(bucket)||0)+Math.random();
   if(score>best){selected=q;best=score;}
  }
  return selected;
 }
 const all=skills.flatMap(skill=>pools[skill]);
 for(const skill of sequence){
  // Prioritize type quota; then fall back to a different unique skill.
  const q=bestFrom(pools[skill])||bestFrom(all)||
   all[Math.floor(Math.random()*all.length)];
  if(!q)break;
  usedTexts.add(q.text);
  const fact=family(q),bucket=Math.min(4,Math.floor(q.answer*5/(maximum+1)));
  families.set(fact,(families.get(fact)||0)+1);
  answers.set(q.answer,(answers.get(q.answer)||0)+1);
  buckets.set(bucket,(buckets.get(bucket)||0)+1);
  chosen.push(q);
 }
 for(let i=chosen.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [chosen[i],chosen[j]]=[chosen[j],chosen[i]];
 }
 return chosen;
}


/**
 * Foundations for 1–2 classes. Finite candidate pools, three comparison signs
 * with stable shares, and a preference for nontrivial, varied arithmetic facts.
 * At extremely small maximum values, repetition is unavoidable.
 */
function mathFoundations(topic,maximum,total){
 const compare=topic==='Сравнение чисел';
 const all=[],signs={'<':[],'>':[],'=':[]};
 if(compare){
  for(let a=0;a<=maximum;a++)for(let b=0;b<=maximum;b++){
   const sign=a<b?'<':a>b?'>':'=';
   signs[sign].push({
    text:a+' □ '+b,answer:sign,blank:true,kind:'comparison',
    family:Math.min(a,b)+':'+Math.max(a,b),trivial:a===0||b===0,values:[a,b]
   });
  }
 }else{
  for(let sum=1;sum<=maximum;sum++)for(let known=0;known<=sum;known++){
   const missing=sum-known;
   for(const text of [sum+' = '+known+' + □',sum+' = □ + '+known]){
    all.push({text,answer:missing,blank:true,kind:'composition',
      family:sum+':'+Math.min(known,missing)+':'+Math.max(known,missing),
      trivial:known===0||missing===0,values:[sum,known]});
   }
  }
 }
 const pattern=['<','>','<','>','='];
 const order=Array.from({length:total},(_,i)=>compare?pattern[i%pattern.length]:'composition');
 for(let i=order.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [order[i],order[j]]=[order[j],order[i]];
 }
 const textCount=new Map(),familyCount=new Map(),valueCount=new Map(),questions=[];
 function score(q){
  return -150*(textCount.get(q.text)||0)-13*Number(q.trivial)-
   5*(familyCount.get(q.family)||0)-
   0.6*(valueCount.get(q.values[0])||0)-
   0.4*(valueCount.get(q.values[1])||0)+Math.random();
 }
 function pick(pool){
  // Sample larger pools to keep worksheet generation responsive for max=100.
  let best=null,quality=-Infinity;
  const attempts=Math.min(pool.length,240);
  for(let i=0;i<attempts;i++){
   const q=pool[Math.floor(Math.random()*pool.length)];
   const rank=score(q);
   if(rank>quality){best=q;quality=rank;}
  }
  // Exhaust tiny ranges so a new expression always beats needless repetition.
  if(pool.length<=240)for(const q of pool){
   const rank=score(q);
   if(rank>quality){best=q;quality=rank;}
  }
  return best;
 }
 for(const kind of order){
  const q=pick(compare?signs[kind]:all);
  if(!q)continue;
  textCount.set(q.text,(textCount.get(q.text)||0)+1);
  familyCount.set(q.family,(familyCount.get(q.family)||0)+1);
  for(const v of q.values)valueCount.set(v,(valueCount.get(v)||0)+1);
  questions.push({text:q.text,answer:q.answer,blank:true,kind:q.kind});
 }
 return questions;
}


/** Generate local, solvable stories using one addition or subtraction. */
function mathWordProblems(maximum,total){
 const scenes=[
  {start:'У Ани',where:'у Ани',add:'Ей подарили ещё',sub:'Она отдала',forms:['карандаш','карандаша','карандашей']},
  {start:'У Димы',where:'у Димы',add:'Ему подарили ещё',sub:'Он отдал',forms:['мяч','мяча','мячей']},
  {start:'В коробке',where:'в коробке',add:'Туда положили ещё',sub:'Оттуда взяли',forms:['кубик','кубика','кубиков']},
  {start:'В пенале',where:'в пенале',add:'Туда положили ещё',sub:'Оттуда вынули',forms:['фломастер','фломастера','фломастеров']},
  {start:'На полке',where:'на полке',add:'Туда поставили ещё',sub:'Оттуда забрали',forms:['альбом','альбома','альбомов']},
  {start:'В рюкзаке',where:'в рюкзаке',add:'Туда положили ещё',sub:'Оттуда достали',forms:['значок','значка','значков']},
  {start:'В ящике',where:'в ящике',add:'Туда положили ещё',sub:'Оттуда взяли',forms:['конверт','конверта','конвертов']},
  {start:'У Лены',where:'у Лены',add:'Ей подарили ещё',sub:'Она подарила',forms:['шарик','шарика','шариков']},
  {start:'На столе',where:'на столе',add:'Туда положили ещё',sub:'Оттуда убрали',forms:['листок','листка','листков']},
  {start:'В шкафу',where:'в шкафу',add:'Туда положили ещё',sub:'Оттуда взяли',forms:['пазл','пазла','пазлов']}
 ];
 function noun(n,forms){
  const lastTwo=n%100,last=n%10;
  return forms[lastTwo>=11&&lastTwo<=14?2:last===1?0:last>=2&&last<=4?1:2];
 }
 const was=n=>n%10===1&&n%100!==11?'был':'было';
 const pools={'+':[],'−':[]};
 for(let a=1;a<=maximum;a++){
  for(let b=1;a+b<=maximum;b++)pools['+'].push([a,b]);
  for(let b=1;b<a;b++)pools['−'].push([a,b]);
 }
 const order=Array.from({length:total},(_,i)=>i%2===0?'+':'−');
 for(let i=order.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [order[i],order[j]]=[order[j],order[i]];
 }
 const used=new Set(),factCount=new Map(),sceneCount=new Map(),answerCount=new Map(),result=[];
 for(const operation of order){
  const pool=pools[operation];
  if(!pool.length)continue;
  let best=null,bestScore=-Infinity;
  const attempts=Math.min(240,Math.max(80,pool.length));
  for(let i=0;i<attempts;i++){
   const [a,b]=pool[Math.floor(Math.random()*pool.length)];
   const sceneId=Math.floor(Math.random()*scenes.length),scene=scenes[sceneId];
   const answer=operation==='+'?a+b:a-b;
   const key=operation+':'+a+':'+b+':'+sceneId;
   const family=operation+':'+a+':'+b;
   const score=-300*Number(used.has(key))-14*(factCount.get(family)||0)-
    4*(sceneCount.get(sceneId)||0)-1.5*(answerCount.get(answer)||0)+Math.random();
   if(score>bestScore){bestScore=score;best={a,b,answer,sceneId,key,family};}
  }
  if(!best)continue;
  const {a,b,answer,sceneId,key,family}=best,scene=scenes[sceneId],forms=scene.forms;
  const text=scene.start+' '+was(a)+' '+a+' '+noun(a,forms)+'. '+
   (operation==='+'?scene.add:scene.sub)+' '+b+' '+noun(b,forms)+'. '+
   'Сколько '+forms[2]+' '+(operation==='+'?'стало':'осталось')+' '+scene.where+'?';
  result.push({kind:'word',text,answer,operation,operands:[a,b],
   solution:a+' '+operation+' '+b+' = '+answer,unit:forms[2]});
  used.add(key);
  factCount.set(family,(factCount.get(family)||0)+1);
  sceneCount.set(sceneId,(sceneCount.get(sceneId)||0)+1);
  answerCount.set(answer,(answerCount.get(answer)||0)+1);
 }
 return result;
}

function mathGenerate(grade,requestedTopic,level,range,count){
 const grades=Object.keys(mathTopicsByGrade);
 const gradeIndex=Math.max(0,grades.indexOf(grade));
 const topics=mathTopicsByGrade[grades[gradeIndex]];
 const selected=topics.includes(requestedTopic)?requestedTopic:topics[0];
 const maximum=Math.max(2,Math.min(Number(range)||20,[20,100,100,200,200][gradeIndex],200));
 const total=Math.max(1,Math.min(40,Math.floor(Number(count)||1)));
 const random=(min,max)=>min+Math.floor(Math.random()*(max-min+1));
 const choose=items=>items[random(0,items.length-1)];
 const productPairs=(factorMax)=>{
  const pairs=[];
  for(let a=1;a<=factorMax;a++)for(let b=1;b<=factorMax;b++)if(a*b<=maximum)pairs.push([a,b]);
  return pairs;
 };
 const times=productPairs(gradeIndex===2?10:gradeIndex===3?12:20);
 const transitions=[];
 for(let a=1;a<maximum;a++)for(let b=1;b<=9&&a+b<=maximum;b++){
  if(a%10!==0&&a%10+b>=10)transitions.push([a,b]);
 }
 function one(topic){
  if(topic==='Сложение и вычитание'){
   if(level==='Со скобками'){
    const delta=random(0,maximum),c=random(0,maximum-delta),b=delta+c;
    if(Math.random()<0.5){const a=random(0,maximum-delta);return {text:a+' + ('+b+' − '+c+')',answer:a+delta};}
    const a=random(delta,maximum);
    return {text:a+' − ('+b+' − '+c+')',answer:a-delta};
   }
   if(level==='Несколько действий'){
    let value=random(0,maximum),text=String(value);
    for(let i=0;i<2;i++){
     const add=Math.random()<0.5;
     const delta=random(0,add?maximum-value:value);
     text+=' '+(add?'+':'−')+' '+delta;value+=add?delta:-delta;
    }
    return {text,answer:value};
   }
   if(Math.random()<0.5){const a=random(0,maximum),b=random(0,maximum-a);return {text:a+' + '+b,answer:a+b};}
   const a=random(0,maximum),b=random(0,a);return {text:a+' − '+b,answer:a-b};
  }
  if(topic==='Пропущенное число'){
   const missing=random(0,maximum),other=random(0,maximum-missing),sum=missing+other;
   const forms=['□ + '+other+' = '+sum,other+' + □ = '+sum,sum+' − □ = '+other,sum+' − '+other+' = □'];
   return {text:choose(forms),answer:missing,blank:true};
  }
  if(topic==='Переход через десяток'){
   const [a,b]=choose(transitions);
   return {text:a+' + '+b,answer:a+b};
  }
  if(topic==='Таблица умножения'||topic==='Деление без остатка'||topic==='Умножение и деление'){
   const [a,b]=choose(times);
   const divide=topic==='Деление без остатка'||(topic==='Умножение и деление'&&Math.random()<0.5);
   return divide?{text:(a*b)+' : '+a,answer:b}:{text:a+' × '+b,answer:a*b};
  }
  if(topic==='Порядок действий'){
   const [a,b]=choose(times),product=a*b,kind=random(0,3);
   if(kind===0){const extra=random(0,maximum-product);return {text:extra+' + '+a+' × '+b,answer:extra+product};}
   if(kind===1){const extra=random(0,product);return {text:a+' × '+b+' − '+extra,answer:product-extra};}
   if(kind===2){const first=random(0,a);return {text:'('+first+' + '+(a-first)+') × '+b,answer:product};}
   const extra=random(0,maximum-a);return {text:b+' × ('+(a+extra)+' − '+extra+')',answer:product};
  }
  if(topic==='Доли числа'){
   const denominators=[2,3,4,5,6].filter(x=>x<=maximum);
   const denominator=choose(denominators),unit=random(1,Math.floor(maximum/denominator));
   const numerator=random(1,denominator-1);
   return {text:numerator+'/'+denominator+' от '+(denominator*unit),answer:numerator*unit};
  }
  return {text:'0 + 0',answer:0};
 }
 if(gradeIndex<=1&&selected==='Текстовые задачи'){
  return {topic:selected,maximum,questions:mathWordProblems(maximum,total)};
 }
 if(gradeIndex<=1&&(selected==='Сравнение чисел'||selected==='Состав числа')){
  return {topic:selected,maximum,questions:mathFoundations(selected,maximum,total)};
 }
 if(gradeIndex===0&&selected===topics[0]&&level==='Простые'){
  return {topic:selected,maximum,questions:mathFirstGradeMixed(maximum,total)};
 }
 if(gradeIndex>=1&&selected===topics[0]){
  return {topic:selected,maximum,questions:mathUpperGradeMixed(gradeIndex,maximum,total,one,transitions)};
 }
 const results=[],seen=new Set();
 for(let i=0;i<total;i++){
  let question;
  for(let attempt=0;attempt<100;attempt++){
   const topic=selected===topics[0]?choose(topics.slice(1)):selected;
   question=one(topic);
   if(!seen.has(question.text))break;
  }
  seen.add(question.text);results.push(question);
 }
 return {topic:selected,maximum,questions:results};
}


/* M5.1: independent daily snapshots built with the existing classroom-safe
   arithmetic generator. The requested difficulty and range are upper limits. */
function mathPackDays(value){
 return ({"5 занятий":5,"10 занятий":10,"20 занятий":20})[value]||1;
}
function mathGeneratePack(grade,topic,level,range,count,pack){
 const total=mathPackDays(pack);
 if(total===1)return mathGenerate(grade,topic,level,range,count);
 const max=Math.max(2,Number(range)||20);
 const stages=max<=10?[max,max,max]:max<=20?[10,max,max]:
  [Math.min(20,max),Math.min(50,max),max];
 const levels=level==="Со скобками"
  ?["Простые","Несколько действий","Со скобками"]
  :level==="Несколько действий"
   ?["Простые","Простые","Несколько действий"]
   :["Простые","Простые","Простые"];
 const titles=["Разминка","Практика","Закрепление"];
 const days=Array.from({length:total},(_,i)=>{
  const stage=Math.min(2,Math.floor(i*3/total));
  return {...mathGenerate(grade,topic,levels[stage],stages[stage],count),
   stage:titles[stage],number:i+1};
 });
 return {kind:"math-pack",days};
}
