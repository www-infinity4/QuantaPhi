// QuantaPhi Traffic Intelligence: strict provenance before presentation.
// No model, heuristic or client-side user-agent check can verify a human identity.
export const EMPTY='—';
const COUNT=n=>Number.isSafeInteger(n)&&n>=0;
const UTC=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{3})?Z$/.test(s)&&
 Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===(s.includes('.')?s:s.replace('Z','.000Z'));
const DAY=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const PRECISIONS=new Set(['observed','sampled_estimate','modeled_estimate']);
const UNITS=new Set(['requests','views','users','sessions','events']);
export const SIGNAL_KEYS=['realtimeActiveUsers','verifiedBots','suspicious','unknown','humanLikely'];
export const PAGE_KEYS=['edgeRequests','ga4Views','activeUsers','verifiedBots','suspicious','unknown','humanLikely'];

export function formatMetric(metric){
 if(metric==null)return EMPTY;
 if(!COUNT(metric.value))return EMPTY;
 return (metric.basis==='sampled_estimate'||metric.basis==='modeled_estimate'?'≈':'')+metric.value.toLocaleString('en-US');
}
export function parseLedger(d){
 if(!d||d.schemaVersion!==2||d.site!=='quantaphi.org'||
  d.source!=='Cloudflare GraphQL httpRequests1dGroups'||d.scope!=='recorded_since'||
  d.historicComplete!==false||d.includesBots!==true||!DAY(d.since)||!DAY(d.through)||
  d.since>d.through||!UTC(d.fetchedAt)||Date.parse(d.fetchedAt)>Date.now()+5*60*1000||
  !COUNT(d.requests)||!COUNT(d.pageViews)||typeof d.refreshConfigured!=='boolean'||
  !d.last7Days||!COUNT(d.last7Days.requests)||!COUNT(d.last7Days.pageViews)||
  !COUNT(d.last7Days.daysRecorded)||d.last7Days.daysRecorded>7)
  throw Error('invalid Cloudflare ledger');
 return {requests:d.requests,pageViews:d.pageViews,since:d.since,through:d.through,
  fetchedAt:d.fetchedAt,includesBots:true,refreshConfigured:d.refreshConfigured,
  refreshStatus:d.refreshStatus||null,sevenDay:d.last7Days};
}
function requirePeriod(p){
 if(!p||!UTC(p.start)||!UTC(p.endExclusive)||p.start>=p.endExclusive)throw Error('invalid period');
 return p;
}
function sourceMap(sources){
 if(!Array.isArray(sources)||sources.length>30)throw Error('invalid sources');
 const result=new Map();
 for(const s of sources){
  if(!s||typeof s.id!=='string'||!/^[a-z0-9][a-z0-9_-]{0,50}$/i.test(s.id)||
   result.has(s.id)||!['Cloudflare','GA4','First-party'].includes(s.provider)||
   typeof s.dataset!=='string'||!s.dataset.trim()||s.dataset.length>180||
   typeof s.query!=='string'||s.query.length>1200||
   !UTC(s.fetchedAt)||!PRECISIONS.has(s.precision)||
   !['connected','stale','failed','manual_import'].includes(s.status))
   throw Error('invalid source record');
  result.set(s.id,s);
 }
 return result;
}
function signal(m,sources){
 if(m==null)return null;
 if(!m||typeof m!=='object'||!COUNT(m.value)||!UNITS.has(m.unit)||
  !PRECISIONS.has(m.basis)||!UTC(m.asOf)||
  typeof m.sourceId!=='string'||!sources.has(m.sourceId))throw Error('invalid metric source or value');
 const source=sources.get(m.sourceId);
 if(source.precision!==m.basis)throw Error('metric and source precision mismatch');
 if(Date.parse(m.asOf)>Date.parse(source.fetchedAt)+60000)throw Error('metric observed after provider fetch');
 return {value:m.value,unit:m.unit,basis:m.basis,sourceId:m.sourceId,asOf:m.asOf};
}
function metricGroup(raw,keys,sources){
 const output={};
 for(const key of keys)output[key]=signal(raw?.[key],sources);
 return output;
}
function safePath(path){
 return typeof path==='string'&&path.length<250&&path.startsWith('/')&&!path.startsWith('//')&&
 !/[?#\u0000-\u001f]/.test(path)&&!path.includes('\\');
}
export function validateAudit(d){
 if(!d||d.schemaVersion!==1||d.site!=='quantaphi.org'||
  !['1h','24h','7d','28d'].includes(d.range))throw Error('invalid audit schema');
 const period=requirePeriod(d.period);
 const previousPeriod=d.previousPeriod==null?null:requirePeriod(d.previousPeriod);
 if(previousPeriod&&(Date.parse(previousPeriod.endExclusive)>Date.parse(period.start)||
  Date.parse(previousPeriod.endExclusive)-Date.parse(previousPeriod.start)!==
  Date.parse(period.endExclusive)-Date.parse(period.start)))
  throw Error('invalid comparison periods');
 const sources=sourceMap(d.sources);
 if(!Array.isArray(d.pages)||d.pages.length>800)throw Error('invalid pages');
 const seen=new Set();
 const pages=d.pages.map(p=>{
  if(!p||!safePath(p.path)||seen.has(p.path))throw Error('invalid page path');
  seen.add(p.path);
  return {path:p.path,current:metricGroup(p.current,PAGE_KEYS,sources),
   previous:metricGroup(p.previous,PAGE_KEYS,sources)};
 });
 return {schemaVersion:1,site:d.site,range:d.range,period,previousPeriod,
  sources:[...sources.values()],signals:metricGroup(d.signals,SIGNAL_KEYS,sources),pages};
}
export function compareMetrics(a,b){
 if(!a||!b||!COUNT(a.value)||!COUNT(b.value)||a.unit!==b.unit||
  a.basis!==b.basis||a.sourceId!==b.sourceId)return null;
 return {delta:a.value-b.value,percent:b.value===0?null:((a.value-b.value)/b.value)*100};
}
