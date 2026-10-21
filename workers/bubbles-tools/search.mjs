// Public, read-only lookup tools for Bubbles. No user-provided network destination is fetched.
const trim=(v,n=260)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const SAFE_HOST=/^(?!localhost$)(?!.*\.localhost$)(?!.*\.local$)(?!127\.)(?!10\.)(?!192\.168\.)(?!169\.254\.)(?!172\.(?:1[6-9]|2\d|3[01])\.)(?!0\.)(?!\[)(?!.*\.internal$)[a-z0-9.-]+$/i;
const safeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&SAFE_HOST.test(u.hostname)?u.href:null;}catch{return null;}};
const getJson=async(fetcher,url,options={})=>{
 const result=await fetcher(url,{signal:AbortSignal.timeout(9000),headers:{Accept:'application/json'},...options,redirect:'manual'});
 if(!result.ok)throw Error('upstream_http_'+result.status);
 const body=await result.text();
 if(body.length>650000)throw Error('upstream_too_large');
 return JSON.parse(body);
};
export function lookupKind(message){
 const s=trim(message,3000).replace(/^(?:(?:please|hey bubbles|bubbles)[,:]?\s+)*/i,'').replace(/^(?:can|could|would|will)\s+you\s+/i,'');
 if(/\b(?:build|create|code|implement|repair|fix|develop|design)\b.{0,70}\b(?:weather|forecast)\b.{0,35}\b(?:app|widget|page|site|api)\b/i.test(s))return null;
 if(/\b(?:weather|forecast|temperature outside|temperature in|will it rain|is it raining|will it snow|is it snowing|how hot is it|how cold is it|what(?:'s| is) it like outside|conditions outside|do i need an umbrella)\b/i.test(s))return 'weather.current';
 if(/^\s*(?:do\s+(?:a\s+)?(?:quick\s+)?search(?:\s+for)?|google(?:\s+search|\s+it|\s+for)?|search(?:\s+(?:google|the web|online|for|on google|with google))?|look\s+up|find\s+(?:online|on the web)|browse(?:\s+the web)?)\b/i.test(s)
   ||/\b(?:search\s+(?:the\s+)?web|search\s+google|look\s+up\s+online|find\s+(?:it\s+)?online|latest\s+(?:information|updates)|what(?:'s| is)\s+the\s+latest)\b/i.test(s))return 'web.search';
 return null;
}
export function searchTerms(utterance){
 return trim(utterance,1200)
  .replace(/^\s*(?:(?:please|hey bubbles|bubbles)[,:]?\s+)*(?:(?:can|could|would|will) you\s+|i want you to\s+|tell me\s+)?/i,'')
  .replace(/^(?:do\s+(?:a\s+)?(?:quick\s+)?search(?:\s+for)?|google(?:\s+search|\s+for)?|search(?:\s+(?:google|the web|online|for|on google|with google))?|look\s+up|find\s+(?:online|on the web)|browse(?:\s+the web)?)\s*/i,'')
  .replace(/^\s*(?:for|about)\s+/i,'').replace(/[?.\s]+$/,'').slice(0,350);
}
const googleRequested=s=>/\bgoogle\b/i.test(s)&&/\b(?:search|look\s+up|find|google\s+it)\b/i.test(s);
export async function webSearch(message,env={},fetcher=fetch){
 const query=searchTerms(message);
 if(!query||query.length<2)return {ok:false,reason:'query_required',query};
 const googleIntent=googleRequested(message);
 const googleSearchUrl='https://www.google.com/search?'+new URLSearchParams({q:query});
 const attempts=[];
 let results=[],provider='';
 // Google Custom Search JSON API can work only for entitled legacy API customers.
 // Never expose the key to the Android app, webpage or response.
 if(env.GOOGLE_SEARCH_API_KEY&&env.GOOGLE_SEARCH_CX){
  try{
   const endpoint='https://www.googleapis.com/customsearch/v1?'+new URLSearchParams({key:env.GOOGLE_SEARCH_API_KEY,cx:env.GOOGLE_SEARCH_CX,q:query,num:'7',safe:'active'});
   const raw=await getJson(fetcher,endpoint);
   results=(raw.items||[]).map(x=>({title:trim(x.title,220),url:safeUrl(x.link),snippet:trim(x.snippet,600),engine:'google'})).filter(x=>x.title&&x.url).slice(0,7);
   if(results.length)provider='Google Programmable Search';
  }catch{attempts.push('google_api_unavailable');}
 }
 // The owner's existing Infinity Phi / QuantaPhi SearXNG broker is the default.
 // An explicitly requested Google search first asks SearXNG for its Google engine.
 // Only rows attributed by the broker to Google are labeled Google results.
 const broker='https://orange-brook-a2ac.marvaseater.workers.dev/search';
 const brokerQuery=async(engineOnly)=>{
  const url=broker+'?'+new URLSearchParams({q:query,format:'json',categories:'general',safesearch:'1',...(engineOnly?{engines:'google'}:{})});
  // Preserve the binding receiver; public same-zone Worker fetches cannot route here.
  const brokerFetch=typeof env.SEARCH?.fetch==='function'?(input,options)=>env.SEARCH.fetch(input,options):fetcher;
  const data=await getJson(brokerFetch,url);
  const raw=Array.isArray(data.results)?data.results:[];
  return raw.map(x=>({title:trim(x.title,220),url:safeUrl(x.url),snippet:trim(x.content||x.description,600),
   engine:trim(x.engine||((Array.isArray(x.engines)&&x.engines.includes('google'))?'google':'web'),45)}))
   .filter(x=>x.title&&x.url).filter((x,i,all)=>all.findIndex(y=>y.url===x.url)===i).slice(0,7);
 };
 if(!results.length&&googleIntent){
  try{const googleRows=(await brokerQuery(true)).filter(x=>x.engine.toLowerCase()==='google');if(googleRows.length){results=googleRows;provider='Google via Infinity SearXNG';}}
  catch{attempts.push('searxng_google_unavailable');}
 }
 if(!results.length){
  try{results=await brokerQuery(false);provider='Infinity Phi / QuantaPhi search';}
  catch{attempts.push('infinity_search_unavailable');}
 }
 return {ok:results.length>0,query,results,provider:results.length?provider:'unavailable',googleSearchUrl,
  googleVerified:results.length>0&&/google/i.test(provider),requestedGoogle:googleIntent,attempts};
}
export function weatherPlace(message,location){
 const s=trim(message,400);
 const zip=s.match(/\b\d{5}(?:-\d{4})?\b/);
 if(zip)return zip[0];
 let match=s.match(/\b(?:weather|forecast|temperature|rain|raining|snow|snowing)\b[\s\S]*?\b(?:in|for|at|near)\s+([a-z0-9][a-z0-9 ,.'-]{1,110})/i);
 if(!match)match=s.match(/\b(?:in|at|near)\s+([a-z0-9][a-z0-9 ,.'-]{1,110})\s+(?:weather|forecast)\b/i);
 const explicit=trim((match?.[1]||'').replace(/\b(?:right now|today|tomorrow|this evening|this afternoon|this morning|please|currently)\b.*$/i,''),110);
 if(explicit)return explicit;
 if(typeof location==='string'&&trim(location,100))return trim(location,100);
 if(location&&typeof location==='object'&&trim(location.city,80))return trim(location.city+' '+trim(location.state||location.region,60),110);
 return '';
}

// A comparison is an explicit set of places, never one invented combined city.
// At most four verified Open-Meteo lookups, with the same bounds as single weather.
// Normalize state tokens only for grouping expressly named locations;
// never silently apply a state to an unrelated, unmentioned town.
const US_STATES=new Set(('alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia|al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc').split('|'));
export function weatherLocations(message){
 const q=trim(message,550);
 const match=q.match(/\b(?:weather|forecast|temperatures?)\b[\s\S]*?\b(?:in|for|at|near)\s+(.+)$/i);
 if(!match)return [];
 // A follow-up sentence is not part of a place name. Leave abbreviations
 // such as "St. Louis" alone while removing question and instruction clauses.
 const phrase=match[1].split(/[?!]|(?:\.\s+)(?=(?:include|tell|show|give|cite|mention|explain|say|please|check)\b)/i)[0];
 const raw=phrase.replace(/\s+(?:right now|today|tomorrow|currently|this evening|this morning)\b.*$/i,'')
  .replace(/[\s.]+$/g,'').trim();
 if(!raw)return [];
 let parts=raw.split(/\s*;\s*/).map(s=>s.replace(/^and\s+/i,'').trim()).filter(Boolean);
 if(parts.length===1){
  const normalized=raw.replace(/\s*,?\s+and\s+/gi,', ');
  const names=normalized.split(/\s*,\s*/).map(s=>s.trim()).filter(Boolean);
  const isState=value=>US_STATES.has(String(value||'').toLowerCase());
  // "Albia, Lovilia, and Ottumwa, Iowa" names one shared state.
  // "Albia, Iowa, Omaha, Nebraska" names two explicit city/state pairs.
  if(names.length>=3&&isState(names.at(-1))&&names.slice(0,-1).every(x=>!isState(x)))
   parts=names.slice(0,-1).map(city=>city+', '+names.at(-1));
  else if(names.length>=4&&names.length%2===0)
   parts=Array.from({length:names.length/2},(_,i)=>names[2*i]+', '+names[2*i+1]);
  else if(/\band\b/i.test(raw))
   parts=raw.split(/\s*,?\s+and\s+/i).map(x=>x.trim()).filter(Boolean);
 }
 if(parts.length<2)return [];
 const valid=parts.every(p=>/^[a-z][a-z .'-]*(?:,\s*[a-z][a-z .'-]*)?$/i.test(p)&&p.length<=110&&p.length>=3);
 if(!valid)return [];
 return [...new Set(parts.map(p=>p.replace(/\s+/g,' ')))];
}

export async function compareWeather(message,fetcher=fetch){
 const locations=weatherLocations(message);
 if(locations.length<2)return null;
 if(locations.length>4)return {ok:false,needsLocation:true,output:'I can compare up to four named locations at a time. Please choose four or fewer.',locations:[]};
 const observations=await Promise.all(locations.map(async location=>{
  const result=await currentWeather(/\btomorrow\b/i.test(message)?'weather tomorrow':'weather now',location,fetcher);
  return {requested:location,...result};
 }));
 const count=observations.filter(x=>x.ok).length;
 return {ok:count===observations.length,partial:count>0&&count<observations.length,
  locations:observations,provider:'Open-Meteo',
  output:observations.map(x=>(x.ok?'✓ ':'Could not verify ')+x.requested+': '+x.output).join('\n\n')};
}

const descriptions={
 0:'clear',1:'mostly clear',2:'partly cloudy',3:'overcast',45:'foggy',48:'freezing fog',
 51:'light drizzle',53:'drizzle',55:'heavy drizzle',56:'freezing drizzle',57:'heavy freezing drizzle',
 61:'light rain',63:'rain',65:'heavy rain',66:'freezing rain',67:'heavy freezing rain',
 71:'light snow',73:'snow',75:'heavy snow',77:'snow grains',80:'light rain showers',
 81:'rain showers',82:'heavy rain showers',85:'snow showers',86:'heavy snow showers',
 95:'thunderstorms',96:'thunderstorms with hail',99:'thunderstorms with heavy hail'
};
const num=v=>typeof v==='number'&&Number.isFinite(v)?Math.round(v):null;
export function forecastDate(message,timeZone,now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const value=type=>parts.find(p=>p.type===type).value;
 const date=new Date(value('year')+'-'+value('month')+'-'+value('day')+'T12:00:00Z');
 date.setUTCDate(date.getUTCDate()+(/\btomorrow\b/i.test(message)?1:0));
 return date.toISOString().slice(0,10);
}
export async function currentWeather(message,location=null,fetcher=fetch){
 const place=weatherPlace(message,location);
 if(!place)return {ok:false,needsLocation:true,output:'Which town and state should I use for your weather? Tell me once, for example, Albia, Iowa.'};
 try{
  const postal=/^\d{5}(?:-\d{4})?$/.test(place);
  const searches=[postal?place.slice(0,5):place];
  // Geocoder may reject "City State"; try the city portion while matching state.
  const comma=place.indexOf(',');
  if(comma>0)searches.push(place.slice(0,comma));
  else if(place.split(/\s+/).length>=2)searches.push(place.replace(/\s+\S+$/,''));
  let places=[],geocoderConnected=false;
  for(const term of [...new Set(searches)]){
   const endpoint='https://geocoding-api.open-meteo.com/v1/search?'+new URLSearchParams({name:term,count:'10',language:'en',format:'json',...(postal?{countryCode:'US'}:{})});
   try{const data=await getJson(fetcher,endpoint);geocoderConnected=true;places=(data.results||[]).filter(x=>!postal||x.country_code==='US');if(places.length)break;}catch{/* Try a narrower city query. */}
  }
  if(!places.length)return {ok:false,output:geocoderConnected?'I could not identify '+place+' in the weather service. Please give a town and state or postal code.':'I could not reach the live weather service for '+place+'. I have no verified conditions to report.'};
  const lower=place.toLowerCase();
  const score=x=>{const city=trim(x.name,90).toLowerCase(),state=trim(x.admin1,90).toLowerCase(),country=trim(x.country,90).toLowerCase();
   return (lower===city?10:lower.startsWith(city+' ' )||lower.startsWith(city+',')?8:0)
    +(lower.includes(state)&&state.length>=3?5:0)+(lower.includes(country)&&country.length>=3?2:0);};
  places.sort((a,b)=>score(b)-score(a));
  const target=places[0];
  if(!Number.isFinite(target.latitude)||!Number.isFinite(target.longitude))throw Error('coordinates_missing');
  const url='https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({
   latitude:String(target.latitude),longitude:String(target.longitude),
   current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
   daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
   temperature_unit:'fahrenheit',wind_speed_unit:'mph',timezone:'auto',forecast_days:'2'});
  const data=await getJson(fetcher,url),c=data.current,d=data.daily;
  const locationLabel=[target.name,target.admin1,target.country].filter(Boolean).join(', ');
  if(/\btomorrow\b/i.test(message)){
   const date=forecastDate(message,data.timezone),index=d?.time?.indexOf(date)??-1;
   const high=index>=0?num(d?.temperature_2m_max?.[index]):null;
   const low=index>=0?num(d?.temperature_2m_min?.[index]):null;
   if(high===null||low===null)return {ok:false,location:locationLabel,output:'The weather service did not return a complete forecast for '+date+' in '+locationLabel+'.'};
   const rain=num(d?.precipitation_probability_max?.[index]);
   return {ok:true,location:locationLabel,forecastDate:date,timeZone:data.timezone,provider:'Open-Meteo',sourceUrl:'https://open-meteo.com/en/docs',
    output:'For '+locationLabel+', tomorrow ('+date+') has a forecast high of '+high+' and low of '+low+' degrees Fahrenheit.'+(rain===null?'':' Peak precipitation chance is '+rain+' percent.')};
  }
  const temperature=num(c?.temperature_2m),feels=num(c?.apparent_temperature);
  if(temperature===null||!c?.time)throw Error('observations_missing');
  const text=['For '+locationLabel+', the latest reported temperature is '+temperature+' degrees Fahrenheit',
   (descriptions[c.weather_code]||'weather conditions unavailable')+'.'];
  if(feels!==null)text.push('Feels like '+feels+' degrees.');
  if(num(c.wind_speed_10m)!==null)text.push('Wind '+num(c.wind_speed_10m)+' miles per hour.');
  if(num(d?.temperature_2m_max?.[0])!==null&&num(d?.temperature_2m_min?.[0])!==null)
   text.push('Today’s high is '+num(d.temperature_2m_max[0])+' and low '+num(d.temperature_2m_min[0])+' degrees.');
  if(num(d?.precipitation_probability_max?.[0])!==null)text.push('Today’s peak precipitation chance is '+num(d.precipitation_probability_max[0])+' percent.');
  text.push('Updated '+c.time+' '+trim(data.timezone_abbreviation||data.timezone,50)+'.');
  return {ok:true,output:text.join(' '),location:locationLabel,observedAt:c.time,timeZone:data.timezone,
   provider:'Open-Meteo',sourceUrl:'https://open-meteo.com/en/docs',temperatureF:temperature};
 }catch{return {ok:false,output:'I could not reach the live weather service for '+place+'. I have no verified conditions to report.'};}
}

