import {createHmac,timingSafeEqual} from 'node:crypto';
const ALLOWED_REPO='www-infinity4/Oracle-Octaves';
const COLORS=new Set(['red','orange','blue','green','pink','purple','black','yellow']);
export function verifyGithubWebhook({body,secret,signature,event,deliveryId}){
 if(typeof body!=='string'||Buffer.byteLength(body,'utf8')>50000||!secret||!/^sha256=[a-f0-9]{64}$/i.test(signature||''))throw Error('webhook_signature_required');
 const expected=createHmac('sha256',secret).update(body).digest('hex');
 const provided=Buffer.from(signature.slice(7),'hex'),signed=Buffer.from(expected,'hex');
 if(provided.length!==signed.length||!timingSafeEqual(provided,signed))throw Error('webhook_signature_mismatch');
 if(!['issues','issue_comment'].includes(event)||!/^[-0-9a-f]{36}$/i.test(deliveryId||''))throw Error('webhook_event_invalid');
 let payload;try{payload=JSON.parse(body)}catch{throw Error('webhook_json_invalid')}
 if(payload?.repository?.full_name!==ALLOWED_REPO)throw Error('webhook_repository_not_allowed');
 if(!Number.isInteger(payload.issue?.number)||payload.issue.number<1||payload.issue.number>1e9)throw Error('webhook_ticket_invalid');
 const labels=Array.isArray(payload.issue.labels)?payload.issue.labels.map(x=>x.name):[];
 return Object.freeze({repository:ALLOWED_REPO,issue:payload.issue.number,title:String(payload.issue.title||'').slice(0,150),labels,deliveryId,event,verifiedSignature:true});
}
export function planWebhookTicket(event){
 if(!event?.verifiedSignature||event.repository!==ALLOWED_REPO)throw Error('verified_webhook_required');
 const label=event.labels.find(x=>typeof x==='string'&&/^color:(red|orange|blue|green|pink|purple|black|yellow)$/.test(x));
 const color=label&&COLORS.has(label.slice(6))?label.slice(6):'red';
 return Object.freeze({jobId:'issue:'+event.repository+'#'+event.issue,deliveryId:event.deliveryId,
  color,route:'existing_moltnook_repository_engine',status:'pending_signed_owner_claim',
  title:event.title,verifiedWebhook:true,executable:false,executed:false,
  note:'Signed webhook authenticity does not replace an owner authorization, lease, permission, or CI review.'});
}
