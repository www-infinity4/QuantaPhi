/* Direct program references from www-infinity4/Chiller/data/catalog.js
 * and www-infinity4/TV-Database/js/youtube-only-catalog.js.
 * No full website, guessed archive file, or premium-stream bypass. */
(function(root,factory){const out=factory();if(typeof module==='object'&&module.exports)module.exports=out;root.PhiTVPrograms=out;})(typeof globalThis!=='undefined'?globalThis:window,function(){
'use strict';
const STARQUEST=[
 {title:'The Phantom Planet',videoId:'MqaN40sbap4',year:'1961'},
 {title:'Things to Come',videoId:'22cOGjikPG8',year:'1936'},
 {title:'The Amazing Transparent Man',videoId:'OvJS9WFW7Uc',year:'1960'},
 {title:'Attack from Space',videoId:'duc_edJQaxU',year:'1965'},
 {title:'Phantom from Space',videoId:'SN8R3k73qj0',year:'1953'},
 {title:'Missile to the Moon',videoId:'PkSlAmx_wnk',year:'1958'},
 {title:'The Monster of Piedras Blancas',videoId:'SYKl4PtdPUA',year:'1959'},
 {title:'Serenity',videoId:'WPXS9UtDmyQ',year:'2005'}
];
const CHILLER=[
 {title:'An Unlocked Window',videoId:'YD5xBeGeX5w',family:'hitchcock-1980s',runtimeSeconds:1320},
 {title:'The Night Caller',videoId:'pHJJY4HYYMQ',family:'hitchcock-1980s',runtimeSeconds:1320},
 {title:'Revenge',videoId:'HM_I8T3J0xE',family:'hitchcock-1980s',runtimeSeconds:1320},
 {title:'Alfred Hitchcock Presents — 1985 Story',videoId:'XCbTyjkLT1w',family:'hitchcock-1980s',runtimeSeconds:1320},
 {title:'A Little Peace and Quiet',videoId:'Or1UX7z8YBM',family:'twilight-zone-1980s',runtimeSeconds:1320},
 {title:'Nightcrawlers',videoId:'5EVR17FgTQg',family:'twilight-zone-1980s',runtimeSeconds:1440},
 {title:'Examination Day',videoId:'lrz_bDy71h8',family:'twilight-zone-1980s',runtimeSeconds:900},
 {title:'A Message from Charity',videoId:'ar-p3ika3kU',family:'twilight-zone-1980s',runtimeSeconds:1440}
];
const CHILLER_FEATURE={title:'Blackmail',videoId:'k8gq-GjMEPo',runtimeSeconds:5100,family:'hitchcock-feature'};
const SHOPLC_STREAMS=[
 'https://cdn-shop-lc-01.vos360.video/Content/HLS_HLS/Live/channel%28ShopLCStirrTV%29/master.m3u8',
 'https://cdn-shop-lc-01.akamaized.net/Content/HLS_HLS/Live/channel%28ott%29/master.m3u8',
 'https://cdn-shop-lc-01.akamaized.net/Content/HLS_HLS/Live/channel%28xumo%29/index.m3u8'
];
const valid=id=>/^[\w-]{11}$/.test(String(id||''));
const hash=value=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
const rng=seed=>{let x=seed||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}};
function shuffled(items,seed){const out=items.slice(),random=rng(hash(seed));for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const pad=n=>String(n).padStart(2,'0');
const dayKey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
function chillerSchedule(now){
 const day=dayKey(now),h=shuffled(CHILLER.filter(x=>x.family==='hitchcock-1980s'),'CHILLER|HITCHCOCK|'+day),
 t=shuffled(CHILLER.filter(x=>x.family==='twilight-zone-1980s'),'CHILLER|TWILIGHT|'+day),
 fallback=shuffled(CHILLER,'CHILLER|CORE|'+day),first=(hash(day)&1)===0;
 let hi=0,ti=0,fi=0,previous='',slots=[];
 const next=(items,index)=>{if(!items.length)return null;for(let n=0;n<items.length;n++){const item=items[(index+n)%items.length];if(item.videoId!==previous)return item}return items[index%items.length]};
 for(let slot=0;slot<48;slot++){
  const wantsH=(slot%2===0)===first;
  let program=wantsH?next(h,hi++):next(t,ti++);
  if(!program)program=next(fallback,fi++);
  slots.push(program);previous=program?.videoId||previous;
 }
 if(now.getDay()===6){for(let slot=44;slot<=46;slot++){
  const offset=(slot-44)*1800;
  slots[slot]={...CHILLER_FEATURE,startOffset:offset};
 }}
 return slots;
}
function chillerNow(now=new Date()){
 const slot=now.getHours()*2+Math.floor(now.getMinutes()/30);
 const program=chillerSchedule(now)[slot];if(!program)return null;
 const elapsed=(now.getMinutes()%30)*60+now.getSeconds();
 return {...program,channel:'chiller',start:Math.min(5000,(program.startOffset||0)+elapsed),slot,
  poster:'https://i.ytimg.com/vi/'+program.videoId+'/hqdefault.jpg'};
}
function starquestNow(now=new Date()){
 const serial=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
 const index=((serial%STARQUEST.length)+STARQUEST.length)%STARQUEST.length;
 const program=STARQUEST[index];
 return {...program,channel:'starquest',start:0,poster:'https://i.ytimg.com/vi/'+program.videoId+'/hqdefault.jpg'};
}
function next(channel,current,step=1){
 const entries=channel==='chiller'?CHILLER:STARQUEST;
 const i=entries.findIndex(x=>x.videoId===current?.videoId);
 const index=(i+step%entries.length+entries.length)%entries.length;
 const program=entries[index];
 return {...program,channel,start:0,poster:'https://i.ytimg.com/vi/'+program.videoId+'/hqdefault.jpg'};
}
function now(channel,when=new Date()){
 if(channel==='chiller')return chillerNow(when);
 if(channel==='shoplc')return{channel:'shoplc',title:'Shop LC · live shopping',stream:SHOPLC_STREAMS[0],start:0};
 return starquestNow(when);
}
return Object.freeze({STARQUEST,CHILLER,SHOPLC_STREAMS,CHILLER_FEATURE,valid,now,next,chillerSchedule,chillerNow,starquestNow});
});
