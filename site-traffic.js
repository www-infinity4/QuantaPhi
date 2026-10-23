/* Read live Cloudflare seven-day analytics; fall back to a timestamped verified snapshot. */
(() => {
 'use strict';
 const requests=document.getElementById('qtrafficRequests'),views=document.getElementById('qtrafficViews'),note=document.getElementById('qtrafficNote');
 if(!requests||!views||!note)return;
 let last=null,lastMode='snapshot',busy=false;
 const maximumAge=6*60*60*1000;
 const validCount=n=>Number.isSafeInteger(n)&&n>=0;
 function render(data,mode){
  const age=Date.now()-Date.parse(data.fetchedAt);
  const updated=new Date(data.fetchedAt).toLocaleString();
  if(age>maximumAge){
   requests.textContent='—';views.textContent='—';
   note.textContent='Traffic update overdue. Last verified '+updated+'. Current totals are unavailable.';
   return;
  }
  last=data;lastMode=mode;
  requests.textContent=data.requests.toLocaleString();
  views.textContent=data.pageViews.toLocaleString();
  const end=data.days[data.days.length-1].date;
  note.textContent=(mode==='live'?'Cloudflare API · refreshed automatically':'Verified Cloudflare snapshot · live API not connected')+
   ' · '+data.period.since+'–'+end+' UTC (today partial) · checked '+updated+
   ' · includes bots · not unique visitors or a lifetime total';
 }
 function valid(d){
  const at=Date.parse(d?.fetchedAt);
  return d?.schemaVersion===1&&d.site==='quantaphi.org'&&d.source==='Cloudflare GraphQL httpRequests1dGroups'&&
   Number.isFinite(at)&&at<=Date.now()+60000&&validCount(d.requests)&&validCount(d.pageViews)&&
   Array.isArray(d.days)&&d.days.length===7&&d.period?.timeZone==='UTC'&&
   /^\d{4}-\d{2}-\d{2}$/.test(d.period.since)&&
   !d.days.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!validCount(x.requests)||!validCount(x.pageViews))&&
   d.days.reduce((n,x)=>n+x.requests,0)===d.requests&&
   d.days.reduce((n,x)=>n+x.pageViews,0)===d.pageViews;
 }
 async function fetchStats(path){
  const r=await fetch(path,{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('traffic_unavailable');
  const data=await r.json();
  if(!valid(data))throw Error('traffic_invalid');
  return data;
 }
 async function refresh(){
  if(busy||document.hidden)return;
  busy=true;
  try{
   let data,mode;
   try{data=await fetchStats('/api/site-traffic');mode='live';}
   catch{
    data=await fetchStats('/data/site-traffic.json?v='+Math.floor(Date.now()/60000));
    mode='snapshot';
   }
   render(data,mode);
  }catch{
   if(last&&Date.now()-Date.parse(last.fetchedAt)<=maximumAge){
    render(last,lastMode);note.textContent+=' Refresh failed; showing last verified values.';
   }else{
    requests.textContent='—';views.textContent='—';
    note.textContent='Current Cloudflare traffic unavailable; no invented total is displayed.';
   }
  }finally{busy=false;}
 }
 refresh();
 const timer=setInterval(()=>{if(last)render(last,lastMode);refresh();},5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();