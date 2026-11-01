/* Optional, consent-gated Yandex Metrica. No network requests when METRIKA_ID is 0. */
(()=>{
 "use strict";
 const METRIKA_ID=0; // Replace with the integer ID from metrika.yandex.ru before launch.
 const CONSENT_KEY="printkit.analytics.consent.v1";
 const permittedGoals=new Set(["print_click","kit_saved","catalog_open"]);
 const scriptUrl=document.currentScript?.src||location.href;
 const privacyUrl=new URL("privacy.html",scriptUrl).href;
 const active=Number.isSafeInteger(METRIKA_ID)&&METRIKA_ID>0;
 let started=false, banner=null;
 function readConsent(){
  try{return localStorage.getItem(CONSENT_KEY)}catch{return null}
 }
 function saveConsent(value){
  try{localStorage.setItem(CONSENT_KEY,value)}catch{}
 }
 function closeBanner(){banner?.remove();banner=null}
 function start(){
  if(!active||started)return;
  started=true;
  window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};
  window.ym.l=Date.now();
  const tag=document.createElement("script");
  tag.async=true;
  tag.src="https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(tag);
  window.ym(METRIKA_ID,"init",{
   clickmap:false,trackLinks:false,accurateTrackBounce:true,webvisor:false
  });
 }
 function choose(allowed){
  saveConsent(allowed?"yes":"no");
  closeBanner();
  if(allowed)start();
  else if(started)location.reload(); // Stop tracking in this document after withdrawal.
 }
 function showBanner(){
  if(!active||banner)return;
  banner=document.createElement("section");
  banner.className="pk-consent";
  banner.setAttribute("role","region");
  banner.setAttribute("aria-label","Выбор статистики посещений");
  const copy=document.createElement("p");
  copy.textContent="Помогите улучшать PrintKit: разрешите необязательную статистику посещений через Яндекс Метрику. Имена детей и тексты заданий не отправляем. Можно отказаться — сайт продолжит работать.";
  const details=document.createElement("a");
  details.href=privacyUrl;
  details.textContent="О конфиденциальности";
  const controls=document.createElement("div");
  controls.className="pk-consent-actions";
  const accept=document.createElement("button");
  accept.type="button";accept.textContent="Разрешить";
  accept.onclick=()=>choose(true);
  const reject=document.createElement("button");
  reject.type="button";reject.textContent="Без статистики";
  reject.onclick=()=>choose(false);
  controls.append(accept,reject);
  banner.append(copy,details,controls);
  document.body.append(banner);
 }
 window.printKitAnalytics={
  goal(name){
   if(active&&started&&readConsent()==="yes"&&permittedGoals.has(name)){
    window.ym?.(METRIKA_ID,"reachGoal",name);
   }
  },
  settings(){if(active)showBanner()},
  enabled:()=>active
 };
 document.querySelectorAll("[data-open-analytics-settings]").forEach(link=>{link.hidden=!active});
 if(active){
  const consent=readConsent();
  if(consent==="yes")start();
  else if(consent!=="no")showBanner();
 }
 document.addEventListener("click",event=>{
  const link=event.target.closest?.("[data-open-analytics-settings]");
  if(!link)return;
  event.preventDefault();
  if(active)showBanner();
 });
})();
