/* Cumulative verified Cloudflare traffic. Never turn stale counters into zero. */
(() => {
 'use strict';
 const requests=document.getElementById('qtrafficRequests'),views=document.getElementById('qtrafficViews'),note=document.getElementById('qtrafficNote');
 if(!requests||!views||!note)return;
 const STORAGE_KEY='quantaphi_verified_traffic_v2';
 let best=null,busy=false;
 const validCount=n=>Number.isSafeInteger(n)&&n>=0;
 // Verify real UTC calendar dates; a seven-day label must describe seven days.
 const utcDay=s=>{
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;
  const t=Date.parse(s+'T00:00:00.000Z');
  return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?t:NaN;
 };
 function valid(d){
  const t=Date.parse(d?.fetchedAt);
  const start=utcDay(d?.since),through=utcDay(d?.through);
  const recentStart=utcDay(d?.last7Days?.since),recentUntil=utcDay(d?.last7Days?.until);
  return d?.schemaVersion===2&&d.site==='quantaphi.org'&&d.source==='Cloudflare GraphQL httpRequests1dGroups'&&
   d.scope==='recorded_since'&&d.historicComplete===false&&typeof d.refreshConfigured==='boolean'&&
   Number.isFinite(start)&&Number.isFinite(through)&&start<=through&&
   Number.isFinite(t)&&t<Date.now()+60000&&validCount(d.requests)&&validCount(d.pageViews)&&
   d.last7Days&&validCount(d.last7Days.requests)&&validCount(d.last7Days.pageViews)&&
   validCount(d.last7Days.daysRecorded)&&d.last7Days.daysRecorded<=7&&
   Number.isFinite(recentStart)&&Number.isFinite(recentUntil)&&
   // The recorded ledger may start after the seven-day window begins, or end before it.
   // Neither condition invalidates its durable cumulative totals.
   recentUntil-recentStart===6*86400000&&
   validCount(d.recordedDays)&&d.last7Days.daysRecorded<=d.recordedDays&&
   typeof d.coverageContinuous==='boolean'&&
   d.last7Days.requests<=d.requests&&d.last7Days.pageViews<=d.pageViews;
 }
 // Keep only validated aggregate counts across page reloads. No visitor identifiers are stored.
 try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(valid(saved))best=saved;}catch{}
 function render(d,{fallback=false}={}){
  // Static fallbacks and older responses must not make verified counters shrink after reload.
  let recovered=false;
  if(best&&best.since===d.since&&
   (best.requests>d.requests||best.pageViews>d.pageViews||Date.parse(best.fetchedAt)>Date.parse(d.fetchedAt))){
   d=best;recovered=true;
  }
  best=d;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(best));}catch{}
  requests.textContent=d.requests.toLocaleString();
  views.textContent=d.pageViews.toLocaleString();
  const updated=new Date(d.fetchedAt).toLocaleString();
  const age=Date.now()-Date.parse(d.fetchedAt);
  const live=d.refreshConfigured&&!fallback&&!recovered&&age<60*60*1000&&d.through===new Date().toISOString().slice(0,10);
  const prefix='Recorded since '+d.since+' (earliest available Cloudflare date), through '+d.through+'. ';
  const recent=' Last 7 days (UTC '+d.last7Days.since+' to '+d.last7Days.until+', '+
   d.last7Days.daysRecorded+'/7 days recorded): '+d.last7Days.requests.toLocaleString()+
   ' requests, '+d.last7Days.pageViews.toLocaleString()+' page views.';
  const status=live?'Automatic Cloudflare sync is active. ':(d.refreshConfigured?'Last recorded total; feed is temporarily stale. ':'Last recorded total; automatic ingestion is not yet authorized. ');
  note.textContent=prefix+status+'Last verified '+updated+'.'+recent+
   ' Includes bots; not unique visitors or individual clicks.'+
   (d.coverageContinuous?'':' Some daily records are missing; the total is incomplete.');
 }
 async function load(url){
  const r=await fetch(url,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('traffic_http_'+r.status);
  const d=await r.json();
  if(!valid(d))throw Error('traffic_invalid');
  return d;
 }
 async function refresh(){
  if(busy)return;busy=true;
  try{
   try{render(await load('/api/site-traffic'),{fallback:false});}
   catch{render(await load('/data/site-traffic-lifetime.json?v='+Math.floor(Date.now()/60000)),{fallback:true});}
  }catch{
   if(best)render(best,{fallback:true});
   else{requests.textContent='—';views.textContent='—';note.textContent='Cloudflare lifetime ledger currently unavailable; no estimated counts shown.';}
  }finally{busy=false;}
 }
 refresh();
 setInterval(()=>{if(!document.hidden)refresh();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
