// ISHA Rulebook is an editable research/proposal ledger, never a law engine.
// No navigation, fetching, media collection, visitor identification, or enforcement.
const ALLOWED_STATUSES=Object.freeze(['draft']);
const RULE_FIELDS=Object.freeze(['id','area','observation','measure','evidenceUrl','status','reviewer','updatedAt']);
const HOST=/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
function clean(v,max,label,required=true){
 if(typeof v!=='string'||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw Error('invalid_'+label);
 const text=v.trim();if(required&&!text)throw Error('missing_'+label);return text;
}
function publicHost(host){
 const h=clean(host,253,'host').toLowerCase();
 if(!HOST.test(h)||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.invalid')||h.includes('.onion')||/^\d+(?:\.\d+){3}$/.test(h))throw Error('public_hostname_required');
 return h;
}
function publicEvidence(url){
 if(url==='')return '';
 const raw=clean(url,1200,'evidence_url');
 let u;try{u=new URL(raw)}catch{throw Error('invalid_evidence_url')}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash)throw Error('public_https_report_required');
 publicHost(u.hostname);
 return u.href;
}
export function classifyReference(value){
 let v=clean(value,300,'reference').toLowerCase();
 if(v.includes('://')){
   let u;try{u=new URL(v)}catch{throw Error('invalid_reference')}
   if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error('root_hostname_only');
   v=u.hostname;
 }
 if(v.endsWith('.'))v=v.slice(0,-1);
 if(!HOST.test(v)||v==='localhost'||/^\d+(?:\.\d+){3}$/.test(v))throw Error('hostname_required');
 const onion=/^([a-z2-7]{56})\.onion$/.test(v);
 const gateway=/^([a-z2-7]{56})\.onion\.([a-z0-9-]+\.)*[a-z]{2,}$/.test(v);
 if(v.includes('.onion')&&!onion&&!gateway)throw Error('unsupported_onion_format');
 return Object.freeze({scope:onion?'onion_service':gateway?'gateway':'public_site',host:v,liveChecked:false,operator:'unknown',mediaChecked:false});
}
function stamp(value){
 const v=clean(value,32,'timestamp');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('invalid_timestamp');
 if(new Date(v).toISOString().slice(0,19)!==v.slice(0,19))throw Error('invalid_timestamp');
 return new Date(v).toISOString();
}
export function createRule(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_rule');
 if(Object.keys(input).some(k=>!RULE_FIELDS.includes(k)))throw Error('unexpected_rule_field');
 const id=clean(input.id,16,'rule_id').toUpperCase();
 if(!/^ISHA-\d{3,6}$/.test(id))throw Error('invalid_rule_id');
 return Object.freeze({id,area:clean(input.area,80,'area'),observation:clean(input.observation,600,'observation'),measure:clean(input.measure,900,'measure'),
  evidenceUrl:publicEvidence(input.evidenceUrl||''),status:'draft',reviewer:clean(input.reviewer||'',80,'reviewer',false),updatedAt:stamp(input.updatedAt)});
}
export function validateBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>1024*1024)throw Error('oversize_or_invalid_backup');
 let obj;try{obj=JSON.parse(text)}catch{throw Error('invalid_json')}
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||Object.keys(obj).sort().join('|')!=='rules|version'||obj.version!==1||!Array.isArray(obj.rules)||obj.rules.length>500)throw Error('invalid_backup_schema');
 const out=obj.rules.map(r=>{
   if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join('|')!==[...RULE_FIELDS].sort().join('|'))throw Error('invalid_rule_schema');
   if(!ALLOWED_STATUSES.includes(r.status))throw Error('unreviewed_rule_state');
   return createRule(r);
 });
 if(new Set(out.map(r=>r.id)).size!==out.length)throw Error('duplicate_rule_id');
 return Object.freeze({version:1,rules:out});
}
function csvCell(value){
 let s=String(value??'');
 if(/^[\s]*[=+\-@]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
export function toCSV(rows){
 const keys=['id','area','observation','measure','evidenceUrl','status','reviewer','updatedAt'];
 const headers=['rule_id','area','observation','measure','evidence_url','status','reviewer','updated_at'];
 const parsed=rows.map(r=>createRule(r));
 return headers.join(',')+'\n'+parsed.map(r=>keys.map(k=>csvCell(r[k])).join(',')).join('\n')+(parsed.length?'\n':'');
}
export const SEED_RULES=Object.freeze([
 {id:'ISHA-001',area:'Child protection',observation:'Sexual content involving a minor or credible indicator of it',measure:'Do not request, open, copy, index media, embed or distribute. Preserve only non-graphic public metadata for appropriate assessment.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'},
 {id:'ISHA-002',area:'Media publication rights',observation:'Source authorization, age or consent is unverified',measure:'Do not publish a video Quick Card until lawful provider, rights and applicable age/consent checks are verified.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'},
 {id:'ISHA-003',area:'Source provenance',observation:'An onion address appears through a clearnet gateway or public reference',measure:'Separate gateway and onion origin; cite dates and public sources. Do not infer a private user, uploader, operator or server location.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'},
 {id:'ISHA-004',area:'Proportional safety',observation:'Threat, self-harm, distress or safety concern is observed',measure:'Respond calmly without blame. Refuse instructions that could cause harm and prioritize immediate safety when urgency is credible.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'},
 {id:'ISHA-005',area:'Fair treatment',observation:'Person has a disability or other characteristic not itself evidence of harm',measure:'Do not equate identity or disability with wrongdoing; evaluate consent, actions, and source evidence individually.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'},
 {id:'ISHA-006',area:'Standards proposals',observation:'A new rule, weight, measure or proposal is raised',measure:'Record the observation, source, scope, rationale, measurement, review and appeal path. Do not present proposals as enacted laws.',evidenceUrl:'',status:'draft',reviewer:'',updatedAt:'2026-11-19T22:00:00.000Z'}
]);
