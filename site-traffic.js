/* Public, source-verified Cloudflare totals. No credentials or visit tracking. */
(() => {
 'use strict';
 const requests=document.getElementById('qtrafficRequests'),views=document.getElementById('qtrafficViews'),note=document.getElementById('qtrafficNote');
 if(!requests||!views||!note)return;
 let last=null,busy=false;
 const maximumAge=6*60*60*1000;
 const validCount=n=>Number.isSafeInteger(n)&&n>=0;
 function render(data){
  const age=Date.now()-Date.parse(data.fetchedAt);
  const updated=new Date(data.fetchedAt).toLocaleString();
  if(age>maximumAge){
   requests.textContent='—';views.textContent='—';
   note.textContent='Traffic update overdue. Last verified '+updated+'. Current totals are unavailable.';
   return;
  }
  last=data;requests.textContent=data.requests.toLocaleString();views.textContent=data.pageViews.toLocaleString();
  const lastDay=data.days[data.days.length-1].date;
  note.textContent='Cloudflare · '+data.period.since+'–'+lastDay+' UTC (today partial) · verified '+updated+' · includes bots; not unique visitors. Analytics snapshot, not a real-time counter.';
 }
 async function refresh(){
  if(busy)return;busy=true;
  try{
   const r=await fetch('/data/site-traffic.json?v='+Math.floor(Date.now()/60000),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw Error('traffic_unavailable');
   const d=await r.json(),at=Date.parse(d.fetchedAt);
   if(d.schemaVersion!==1||d.site!=='quantaphi.org'||d.source!=='Cloudflare GraphQL httpRequests1dGroups'||!Number.isFinite(at)||at>Date.now()+60000||
      !validCount(d.requests)||!validCount(d.pageViews)||!Array.isArray(d.days)||d.days.length!==7||
      !d.period||d.period.timeZone!=='UTC'||!/^\d{4}-\d{2}-\d{2}$/.test(d.period.since)||
      d.days.some(x=>!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||!validCount(x.requests)||!validCount(x.pageViews))||
      d.days.reduce((n,x)=>n+x.requests,0)!==d.requests||d.days.reduce((n,x)=>n+x.pageViews,0)!==d.pageViews)throw Error('traffic_invalid');
   render(d);
  }catch{
   if(last&&Date.now()-Date.parse(last.fetchedAt)<=maximumAge){render(last);note.textContent+=' Refresh failed; showing the last verified snapshot.';}
   else{requests.textContent='—';views.textContent='—';note.textContent='Current Cloudflare traffic is unavailable. No estimated total is shown.';}
  }finally{busy=false;}
 }
 refresh();setInterval(()=>{if(last)render(last);if(!document.hidden)refresh();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();