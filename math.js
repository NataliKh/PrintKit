// All arithmetic stays local. Every generated answer is an integer within the selected range.
const mathTopicsByGrade={
 '1 класс':['По программе класса','Сложение и вычитание','Пропущенное число'],
 '2 класс':['По программе класса','Сложение и вычитание','Переход через десяток','Пропущенное число'],
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
 if(gradeIndex===0&&selected===topics[0]&&level==='Простые'){
  return {topic:selected,maximum,questions:mathFirstGradeMixed(maximum,total)};
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
