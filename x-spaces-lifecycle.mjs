/** Provider-confirmed X Space lifecycle, independent of player and wallet code.
 * A public post alone is not proof of a live Space or a retained replay.
 */
export const FRED_SHARED_POST=Object.freeze({
 postId:'2119202415702605899',
 url:'https://x.com/dotkrueger/status/2119202415702605899',
 host:'dotkrueger',
 label:'Fred Krueger · shared X Space post'
});

function canonicalSpace(raw){
 try{
  const url=new URL(String(raw||''));
  if(url.protocol!=='https:'||url.username||url.password||
   !['x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname)||
   !/^\/i\/spaces\/[A-Za-z0-9]{8,30}\/?$/.test(url.pathname))return null;
  return 'https://x.com'+url.pathname.replace(/\/$/,'');
 }catch{return null;}
}

/** Only accepts a fresh, explicit X-provider lifecycle observation for the exact post. */
export function validateSpaceObservation(observation,{now=new Date().toISOString(),postId=FRED_SHARED_POST.postId,maxAgeMs=300000}={}){
 if(!observation||observation.source!=='x_api_lifecycle'||
  observation.postId!==postId||
  String(observation.host||'').replace(/^@/,'').toLowerCase()!==FRED_SHARED_POST.host||
  !['live','ended'].includes(observation.state)||!canonicalSpace(observation.spaceUrl))return false;
 const checked=Date.parse(observation.observedAt),current=Date.parse(now);
 return Number.isFinite(checked)&&Number.isFinite(current)&&
  checked<=current+60000&&current-checked<=maxAgeMs;
}

/** Result never stores, charges, or publishes; archiveEpisode is only a candidate. */
export function planSpaceHandoff(observation,options={}){
 const fallback={stage:'unverified',showInLive:false,mediaStarEpisode:null,reason:'Space lifecycle not independently verified'};
 if(!validateSpaceObservation(observation,options))return fallback;
 if(observation.state==='live')return {
  stage:'live',showInLive:true,mediaStarEpisode:null,spaceUrl:canonicalSpace(observation.spaceUrl),
  reason:'X provider confirmed live at last refresh'
 };
 const link=canonicalSpace(observation.replayUrl);
 const archiveCandidate=observation.replayAvailable===true&&link===canonicalSpace(observation.spaceUrl)
  ?Object.freeze({postId:observation.postId,host:FRED_SHARED_POST.host,
    url:link,status:'recording source confirmed; audio not independently tested',
    hiddenFromLive:true,requiresEditorialImport:true})
  :null;
 return {stage:'ended',showInLive:false,mediaStarEpisode:archiveCandidate,
  reason:archiveCandidate?'Confirmed ended, replay requires Media Star import':'Confirmed ended; replay not verified'};
}
