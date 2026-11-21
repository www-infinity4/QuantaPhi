/* Church of I AM promotional experience, not a fabricated replay/video feed.
   Gary Cardone's original sources only; no automatic audio or false LIVE state. */
(()=>{
 'use strict';
 const host=document.getElementById('churchOfIAmCard');if(!host)return;
 // The publisher's direct CDN is primary. Avoid a third-party Cloudimage
 // proxy; show a second verified portrait on failure, then a readable label.
 const portrait=host.querySelector('.iam-photo');
 if(portrait){
  const backup='https://cdn.theorg.com/82a317f7-13d8-4cc4-817b-0d87647fdda8_medium.jpg';
  function portraitError(){
   if(!portrait.dataset.backupAttempted){
    portrait.dataset.backupAttempted='true';
    portrait.src=backup;
   }else{
    portrait.hidden=true;
    portrait.closest('.iam-photo-wrap')?.classList.add('iam-photo-unavailable');
   }
  }
  portrait.addEventListener('error',portraitError);
  if(portrait.complete&&!portrait.naturalWidth)portraitError();
 }

 const sundayMorning=now=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',
   weekday:'short',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const weekday=parts.find(x=>x.type==='weekday')?.value;
  const hour=Number(parts.find(x=>x.type==='hour')?.value);
  return weekday==='Sun'&&hour>=8&&hour<13;
 };
 const showSunday=()=>{
  const sunday=sundayMorning(new Date());
  host.classList.toggle('iam-sunday',sunday);
  host.dataset.sundayPriority=String(sunday);
  const note=host.querySelector('.iam-sunday-callout');
  if(note)note.textContent=sunday?'Sunday morning · Explore today’s Church of I AM on Gary’s official channels':'';
 };
 showSunday();document.addEventListener('visibilitychange',()=>{if(!document.hidden)showSunday()});
 const actions=host.querySelector('#churchIamActions');
 if(actions){
  import('/quanta-card-actions.mjs').then(({mountCardActions})=>{
   mountCardActions(actions,{
    id:'church-of-i-am',name:'Church of I AM · Gary Cardone',
    category:'Sunday conversations',official:'https://x.com/GaryCardone',
    featureUrl:'https://garycardone.me/',route:'/?card=church-of-i-am'
   });
  }).catch(()=>{
   const p=document.createElement('p');p.textContent='Quick Card actions unavailable; official broadcast and website links remain active.';actions.append(p);
  });
 }
 window.QuantaChurchIam={sundayMorning};
})();