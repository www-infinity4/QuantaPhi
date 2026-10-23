// Fetch only aggregate Cloudflare analytics from the same-origin Worker.
(() => {
 const root=document.getElementById('qtraffic');
 if(!root)return;
 const req=root.querySelector('#qtrafficRequests');
 const visits=root.querySelector('#qtrafficVisits');
 const status=root.querySelector('#qtrafficStatus');
 const number=new Intl.NumberFormat();
 let active=false;
 async function refresh(){
  if(active||document.hidden)return;
  active=true;
  try {
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),10000);
   let response;
   try {response=await fetch('/api/site-traffic',{cache:'no-store',credentials:'omit',signal:controller.signal});}
   finally {clearTimeout(timeout);}
   if(!response.ok)throw Error('unavailable');
   const data=await response.json();
   if(!data.ok||data.period!=='rolling_24h'||!Number.isFinite(data.requests)||!Number.isFinite(data.visits))throw Error('invalid_statistics');
   req.textContent=number.format(data.requests);
   visits.textContent=number.format(data.visits);
   const time=new Date(data.updatedAt);
   status.textContent='Cloudflare · rolling 24 hours · updated '+(Number.isNaN(time.valueOf())?'recently':time.toLocaleString())+
    ' · includes bots · visits are not unique people or page views';
  } catch {
   // Never leave an old hard-coded snapshot masquerading as today's live figure.
   req.textContent='—';
   visits.textContent='—';
   status.textContent='Cloudflare live traffic temporarily unavailable.';
  } finally {active=false;}
 }
 refresh();
 const timer=setInterval(refresh,5*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
})();
