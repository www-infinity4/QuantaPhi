/* Source-aware Infinity TV Guide: public program references only, no guessed provider EPG. */
(function(){
'use strict';
const catalog=window.PhiTVPrograms,programs=document.getElementById('tvGuidePrograms');
const day=document.getElementById('tvGuideDay'),time=document.getElementById('tvGuideTime'),network=document.getElementById('tvGuideNetwork');
const status=document.getElementById('tvGuideStatus'),more=document.getElementById('tvGuideMore');
if(!catalog||!programs||!day||!time||!network||!status||!more)return;
const sourceNames={starquest:'StarQuest',omni:'Omni TV',chiller:'Chiller',shoplc:'Shop LC',kyou:'KYOU · FOX 15.1',livenow:'LiveNOW from FOX'};
const cards={starquest:'infinityStarQuestCard',omni:'infinityOmniTvCard',chiller:'infinityChillerCard',shoplc:'infinityShopLcCard',kyou:'liveFoxGameCard',livenow:'liveFoxNewsCard'};
const externalGuide={kyou:'https://www.kyoutv.com/programming/schedule/',shoplc:'https://www.shoplc.com/pages/live-tv-program-guide',livenow:'https://www.livenowfox.com/live'};
const create=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
const today=new Date();
for(let offset=0;offset<7;offset++){
 const date=new Date(today.getFullYear(),today.getMonth(),today.getDate()+offset,12);
 const label=offset===0?'Today':offset===1?'Tomorrow':date.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
 const option=create('option','',label);option.value=String(offset);day.append(option);
}
const request=decodeURIComponent(location.hash.slice(1)).toLowerCase();
if(Object.hasOwn(sourceNames,request))network.value=request;
let count=10;
function link(parent,label,href){
 const a=create('a','itvg-link',label);a.href=href;
 if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer'}
 parent.append(a);return a;
}
function inRange(hour,period){
 if(period==='all')return true;
 // External broadcaster program time is unknown, so it stays discoverable,
 // explicitly marked as requiring its source schedule.
 if(hour===null)return true;
 return period==='morning'?hour>=6&&hour<12:period==='afternoon'?hour>=12&&hour<18:period==='evening'?hour>=18&&hour<24:hour>=0&&hour<6;
}
function show(){
 const offset=Number(day.value)||0,which=network.value,period=time.value;
 const selectedDate=new Date(today.getFullYear(),today.getMonth(),today.getDate()+offset,12);
 const rows=catalog.guideRows(selectedDate).filter(p=>(which==='all'||which===p.channel)&&inRange(p.hour,period));
 programs.replaceChildren();
 for(const item of rows.slice(0,count)){
  const card=create('article','itvg-item');card.id='guide-'+item.channel+'-'+(item.hour===null?'general':String(item.hour).replace('.','-'));
  const img=create('img','itvg-poster');img.src=item.poster;img.alt='';img.loading='lazy';img.decoding='async';img.width=480;img.height=270;
  img.addEventListener('error',()=>card.classList.add('itvg-unavailable-art'),{once:true});
  const info=create('div','itvg-info');
  info.append(create('small','itvg-channel',sourceNames[item.channel]+' · '+item.timeLabel),
   create('h2','itvg-title',item.title),
   create('p','itvg-description',item.description),
   create('p','itvg-note',item.availabilityNote));
  const links=create('div','itvg-actions');
  link(links,'Open player card', '/?card='+encodeURIComponent(cards[item.channel]));
  link(links,item.channel==='kyou'||item.channel==='shoplc'||item.channel==='livenow'?'Watch on official website':'Watch original video / channel',item.providerUrl);
  if(externalGuide[item.channel])link(links,'Publisher TV Guide',externalGuide[item.channel]);
  info.append(links);card.append(img,info);programs.append(card);
 }
 status.textContent='Showing '+Math.min(count,rows.length)+' of '+rows.length+' entries · Infinity curated selections and external publisher references, not verified network airtimes.';
 more.hidden=rows.length<=count;
}
for(const element of [day,time,network])element.addEventListener('change',()=>{count=10;show()});
more.addEventListener('click',()=>{count+=10;show()});
window.addEventListener('hashchange',()=>{const selected=decodeURIComponent(location.hash.slice(1)).toLowerCase();if(Object.hasOwn(sourceNames,selected)){network.value=selected;count=10;show()}});
show();
})();