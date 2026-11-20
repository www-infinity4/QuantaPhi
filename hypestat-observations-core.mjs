// QuantaPhi HypeStat public observation ledger: pure, offline-only validation.
// No HTTP client, browser automation, account identification, or remote writes.
export const MAX_BYTES=1_000_000;
export const MAX_CHECKS=400;
export const STATUSES=Object.freeze(['live','unavailable','changed','unverified']);
export const VERIFICATIONS=Object.freeze(['unverified','source_reported','corroborated']);
const FIELDS=Object.freeze([
  'id','caseId','checkedAt','status','verification','exactUrl','onionAddress',
  'publicMirror','sourceUrl','corroboratingSource','redirectUrl','sourceReported',
  'observedData','analysis','unknowns','nextAction','custody',
  'screenshotName','screenshotSha256','screenshotSize'
]);
const ONION=/^[a-z2-7]{56}\.onion$/i;
const LOCAL=/(?:^localhost$|\.localhost$|\.local$|\.internal$|\.test$|\.invalid$)$/i;
function object(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected an object');
  const actual=Object.keys(value);
  if(actual.some(k=>!keys.includes(k)))throw new Error('Unknown field in imported data');
}
function string(value,name,max,required=false){
  if(typeof value!=='string')throw new Error(name+' must be text');
  const v=value.trim();
  if(v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new Error(name+' is invalid or too long');
  if(required&&!v)throw new Error(name+' is required');
  return v;
}
export function validateUrl(value,kind='public'){
  const raw=string(value,'URL',1500);
  if(!raw)return '';
  let u;
  try{u=new URL(raw)}catch{throw new Error('Invalid URL')}
  const host=u.hostname.toLowerCase();
  if(!host||u.username||u.password||u.port||host.includes(':')||/^\d+(?:\.\d+){3}$/.test(host)||LOCAL.test(host))throw new Error('Unsafe or private URL');
  if(host.endsWith('.onion')){
    if(kind!=='exact'||!ONION.test(host)||!['http:','https:'].includes(u.protocol))throw new Error('Invalid onion address URL');
  }else if(u.protocol!=='https:'||!host.includes('.')||host.endsWith('.onion'))throw new Error('Public URLs require HTTPS');
  return raw;
}
function validTime(value){
  const v=string(value,'checkedAt',30,true);
  const m=/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)\.(\d{3})Z$/.exec(v);
  if(!m)throw new Error('Timestamp must be complete UTC ISO time');
  const y=+m[1],mon=+m[2],day=+m[3],hr=+m[4],min=+m[5],sec=+m[6];
  if(mon<1||mon>12||day<1||day>31||hr>23||min>59||sec>59)throw new Error('Invalid timestamp');
  const t=new Date(v);
  if(!Number.isFinite(t.getTime())||t.getUTCFullYear()!==y||t.getUTCMonth()+1!==mon||t.getUTCDate()!==day||t.toISOString()!==v)throw new Error('Impossible timestamp');
  return v;
}
export function normalizeCheck(raw){
  object(raw,FIELDS);
  const id=string(raw.id,'id',96,true);
  if(!/^[A-Za-z0-9._:-]+$/.test(id))throw new Error('Invalid record ID');
  const caseId=string(raw.caseId,'caseId',120,true);
  const checkedAt=validTime(raw.checkedAt);
  if(!STATUSES.includes(raw.status))throw new Error('Unknown observation status');
  if(!VERIFICATIONS.includes(raw.verification))throw new Error('Unknown verification state');
  const onionAddress=string(raw.onionAddress??'','onionAddress',80).toLowerCase();
  if(onionAddress&&!ONION.test(onionAddress))throw new Error('Only 56-character v3 onion identifiers are accepted');
  const exactUrl=validateUrl(raw.exactUrl??'','exact');
  const publicMirror=validateUrl(raw.publicMirror??'','public');
  const sourceUrl=validateUrl(raw.sourceUrl??'','public');
  const corroboratingSource=validateUrl(raw.corroboratingSource??'','public');
  const redirectUrl=validateUrl(raw.redirectUrl??'','exact');
  if(raw.verification==='source_reported'&&!sourceUrl)throw new Error('Source-reported verification needs its source URL');
  if(raw.verification==='corroborated'&&(!sourceUrl||!corroboratingSource||sourceUrl===corroboratingSource))throw new Error('Corroborating source must be distinct and supplied');
  const screenshotName=string(raw.screenshotName??'','screenshotName',180);
  if(/[\/\\]/.test(screenshotName))throw new Error('Screenshot name must not contain a path');
  const screenshotSha256=string(raw.screenshotSha256??'','screenshotSha256',64).toLowerCase();
  const screenshotSize=raw.screenshotSize??0;
  if(!Number.isSafeInteger(screenshotSize)||screenshotSize<0||screenshotSize>100_000_000)throw new Error('Invalid screenshot size');
  if((screenshotName||screenshotSha256||screenshotSize)&&(!screenshotName||!/^[a-f0-9]{64}$/.test(screenshotSha256)||!screenshotSize))throw new Error('Screenshot fingerprint, filename and size must agree');
  return {
    id,caseId,checkedAt,status:raw.status,verification:raw.verification,
    exactUrl,onionAddress,publicMirror,sourceUrl,corroboratingSource,redirectUrl,
    sourceReported:string(raw.sourceReported??'','sourceReported',2500),
    observedData:string(raw.observedData??'','observedData',2500),
    analysis:string(raw.analysis??'','analysis',2500),
    unknowns:string(raw.unknowns??'','unknowns',1600,true),
    nextAction:string(raw.nextAction??'','nextAction',800,true),
    custody:string(raw.custody??'','custody',1600,true),
    screenshotName,screenshotSha256,screenshotSize
  };
}
export function mergeChecks(existing,incoming){
  if(!Array.isArray(existing)||!Array.isArray(incoming)||existing.length+incoming.length>MAX_CHECKS*2)throw new Error('Too many checks');
  const map=new Map();
  for(const source of [...existing,...incoming]){
    const check=normalizeCheck(source);
    if(map.has(check.id)){
      if(JSON.stringify(map.get(check.id))!==JSON.stringify(check))throw new Error('Observation ID conflict; original is preserved');
    }else map.set(check.id,check);
    if(map.size>MAX_CHECKS)throw new Error('Too many checks');
  }
  return [...map.values()].sort((a,b)=>b.checkedAt.localeCompare(a.checkedAt)||a.id.localeCompare(b.id));
}
export function parseBackup(value){
  if(typeof value!=='string'||value.length>MAX_BYTES)throw new Error('Backup exceeds allowed size');
  let data;
  try{data=JSON.parse(value)}catch{throw new Error('Invalid JSON backup')}
  object(data,['version','checks']);
  if(data.version!==1||!Array.isArray(data.checks))throw new Error('Unsupported backup schema');
  return {version:1,checks:mergeChecks([],data.checks)};
}
export function searchChecks(checks,query='',status=''){
  const q=string(query,'Search',250).toLowerCase();
  if(status&&!STATUSES.includes(status))throw new Error('Unknown status filter');
  return mergeChecks([],checks).filter(c=>(!status||c.status===status)&&(!q||FIELDS.some(field=>typeof c[field]==='string'&&c[field].toLowerCase().includes(q))));
}
export function compareChecks(checks,caseId){
  const key=string(caseId,'caseId',120).toLowerCase();
  const matches=mergeChecks([],checks).filter(c=>c.caseId.toLowerCase()===key);
  const latest=matches[0]??null,previous=matches[1]??null;
  const changes=(!latest||!previous)?[]:
    ['status','verification','exactUrl','onionAddress','publicMirror','redirectUrl','sourceReported','observedData','unknowns'].filter(k=>latest[k]!==previous[k]);
  return {latest,previous,changes,count:matches.length};
}
