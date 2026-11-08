import {RATE_OPTIONS,disclosureForTraffic} from './advertiser-sales-core.mjs';
const $=id=>document.getElementById(id);
const priceHost=$('salesPrices'),status=$('salesCopyStatus');
const dollars=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
for(const price of RATE_OPTIONS){
 const box=document.createElement('article');box.className='price';
 const title=document.createElement('h3');title.textContent=price.label;
 const number=document.createElement('strong');number.textContent=dollars(price.priceUsd);
 const span=document.createElement('p');span.textContent=price.duration;
 const note=document.createElement('small');note.textContent='Proposal only · no promised impressions or clicks';
 box.append(title,number,span,note);priceHost.append(box);
}
// The existing first-party site traffic endpoint is read only. No customer account
// data, coins, advertising events, GitHub writes or external tracking in this page.
async function showTraffic(){
 try{
  const response=await fetch('/api/site-traffic',{headers:{Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('no_live_readback');
  const data=await response.json();
  if(data?.schemaVersion!==2||data.site!=='quantaphi.org'||data.scope!=='recorded_since'||
    data.source!=='Cloudflare GraphQL httpRequests1dGroups'||data.includesBots!==true||
    data.uniqueVisitors!==false||!Number.isSafeInteger(data.pageViews)||data.pageViews<0||
    !/^20\d{2}-\d{2}-\d{2}T/.test(data.fetchedAt||''))throw Error('invalid_or_unqualified_source');
  $('salesTraffic').textContent=disclosureForTraffic(data);
  $('salesNote').textContent='Recorded between '+data.since+' and '+data.through+' UTC. Last source verification: '+
   data.fetchedAt+'. Not unique human visitors and not eligible ad delivery. Historical coverage is not guaranteed complete.';
 }catch{
  $('salesTraffic').textContent='Verified Cloudflare public traffic readback is unavailable in this browser. No advertising audience or click totals are claimed.';
 }
}
void showTraffic();
$('salesCopy').addEventListener('click',async()=>{
 const proposal='QuantaPhi.org · proposed interactive Quick Card sponsorship. Pilot Boost: $100. Flagship Premium: up to $100,000 per month subject to negotiated contract. All packages require permitted creative, Sponsored labeling and an evidence-backed reporting plan. Existing Cloudflare site-wide page views include bots and are not unique visitors, verified ads or clicks. No placements, payments or guarantees are live. More: https://quantaphi.org/advertise.html';
 try{
  if(!navigator.clipboard?.writeText)throw Error('unavailable');
  await navigator.clipboard.writeText(proposal);
  status.textContent='Media-kit summary copied. No proposal was sent and no ad was booked.';
 }catch{
  status.textContent='Clipboard unavailable. You can share this page URL manually. No ad was booked.';
 }
});
