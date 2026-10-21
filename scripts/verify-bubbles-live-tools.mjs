/* Public-only release gate for Bubbles conversation tools.
 * No owner session, API token, wallet, robot job or browser grant is used.
 * Success proves live read-only routing, not Android or owner actions.
 */
import {fileURLToPath} from 'node:url';

const ORIGIN='https://quantaphi.org';
const WORKER='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const WEATHER_REQUEST='What is the current weather in Albia, Lovilia, and Ottumwa, Iowa? Include the observation time and source for each. Tell me if you cannot verify a location.';
const HTML_REQUEST='Read https://quantaphi.org/bubbles.html and explain what this public page says. Use the actual page content and say if it cannot be read.';

export async function verifyLiveBubblesTools(fetcher=fetch){
 const ask=async request=>{
  const response=await fetcher(WORKER,{method:'POST',redirect:'manual',
   headers:{Origin:ORIGIN,'Content-Type':'application/json'},
   body:JSON.stringify({request}),
   signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('live_bubbles_tool_http_'+response.status);
  const data=await response.json();
  if(data.ok!==true||!data.receipt)throw Error('live_bubbles_tool_receipt_missing');
  return data;
 };
 const page=await ask(HTML_REQUEST);
 if(page.receipt.tool!=='web.read_page'||page.receipt.status!=='complete'||
    page.receipt.sourceReadVerified!==true||page.receipt.repositoryActionsVerified!==false||
    page.sourceUrl!=='https://quantaphi.org/bubbles.html'||
    typeof page.content!=='string'||page.content.length<30)
  throw Error('live_public_html_reader_not_verified');
 const weather=await ask(WEATHER_REQUEST);
 const expected=['Albia, Iowa','Lovilia, Iowa','Ottumwa, Iowa'];
 if(weather.receipt.tool!=='weather.current'||
    !['complete','partial','failed'].includes(weather.receipt.status)||
    !Array.isArray(weather.locations)||weather.locations.length!==3||
    expected.some((name,i)=>weather.locations[i]?.requested!==name||
       typeof weather.locations[i]?.output!=='string'||
       (weather.locations[i]?.ok&&(
         typeof weather.locations[i]?.observedAt!=='string'||
         weather.locations[i]?.provider!=='Open-Meteo'))))
  throw Error('live_multi_town_receipts_missing');
 return {ok:true,verified:'live_public_read_only',page:{url:page.sourceUrl,readVerified:true},
  weather:{towns:expected,verifiedCount:weather.locations.filter(p=>p.ok).length,
   missingCount:weather.locations.filter(p=>!p.ok).length,routeVerified:true,
   providerStatus:weather.receipt.status},
  warning:'Not an owner-cloud-browser, Android, GitHub-write, payment or deployment receipt.'};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 try{console.log(JSON.stringify(await verifyLiveBubblesTools(),null,2))}
 catch(error){console.error('BUBBLES_LIVE_ACCEPTANCE_FAILED: '+String(error.message||error));process.exitCode=1}
}
