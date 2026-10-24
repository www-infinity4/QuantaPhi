/* Public Cloudflare traffic display. Never ship credentials to the browser. */
(() => {
 'use strict';
 const requests=document.getElementById('qtrafficRequests'),views=document.getElementById('qtrafficViews'),note=document.getElementById('qtrafficNote');
 if(!requests||!views||!note)return;
 const maximumAge=6*60*60*1000;
 let last=null,busy=false;
 const validCount=n=>Number.isSafeInteger(n)&&n>=0;
 function valid(d){
  const at=Date.parse(d?.fetchedAt);
  return d?.schemaVersion===1&&d.site==='quantaphi.org'&&d.source==='Cloudflare GraphQL httpRequests1dGroups'&&Number.isFinite(at)&&at<=Date.now()+60000&&
   validCount(d.requests)&&validCount(d.pageViews)&&Array.isArray(d.days)&&d.days.length===7&&
   d.period?.timeZone==='UTC'&&/^\d{4}-\d{2}-\d{2}$/.test(d.period.since)&&
   d.days.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&validCount(x.requests)&&validCount(x.pageViews))&&
   d.days.reduce((n,x)=>n+x.requests,0)===d.requests&&d.days.reduce((n,x)=>n+x.pageViews,0)===d.pageViews;
 }
 function render(d,{fallback=false}={}){
  last=d;
  requests.textContent=d.requests.toLocaleString();views.textContent=d.pageViews.toLocaleString();
  const age=Date.now()-Date.parse(d.fetchedAt),verified=new Date(d.fetchedAt).toLocaleString();
  const range=d.period.since+'–'+d.days[d.days.length-1].date+' UTC';
  if(age>maximumAge){
   note.textContent='Historical Cloudflare snapshot only ('+range+'). Last verified '+verified+'. Live totals are unavailable; automatic refresh will retry. Includes bots; not unique visitors.';
  }else{
   note.textContent='Cloudflare · '+range+' (today partial) · verified '+verified+' · includes bots; not unique visitors. '+(fallback?'Live endpoint unavailable; verified snapshot shown.':'Updated via live server feed; analytics can lag.');
  }
 }
 async function load(path){
  const r=await fetch(path,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('traffic_http_'+r.status);
  const d=await r.json();
  if(!valid(d))throw Error('traffic_invalid');
  return d;
 }
 async function refresh(){
  if(busy)return;busy=true;
  try{
   try{render(await load('/api/site-traffic'),{fallback:false});}
   catch{render(await load('/data/site-traffic.json?v='+Math.floor(Date.now()/60000)),{fallback:true});}
  }catch{
   if(last){render(last,{fallback:true});}
   else{requests.textContent='—';views.textContent='—';note.textContent='Cloudflare traffic is unavailable. No estimated totals are shown.';}
  }finally{busy=false;}
 }
 refresh();
 setInterval(()=>{if(last)render(last,{fallback:true});if(!document.hidden)refresh();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
