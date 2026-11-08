/**
 * QuantaPhi Stripe SPONSOR SANDBOX receiver (SOURCE ONLY; not deployed).
 * The only permitted output is an isolated test-event receipt.
 * There is deliberately no sponsor_campaign mutation, wallet action, email,
 * real-money verification, ad activation or PayPal/creator payment support.
 *
 * Do not bind this route to production until an isolated D1 DB and secret
 * have been configured and signed test webhooks independently verified.
 */
const encoder=new TextEncoder();
const MAX_BODY_CHARS=65536;
const validRef=(s,prefix)=>typeof s==='string'&&s.startsWith(prefix)&&/^[a-zA-Z0-9_-]{6,180}$/.test(s);
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const equalHex=(a,b)=>{
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length!==64||!/^[0-9a-f]{64}$/i.test(b))return false;
 let different=0;
 for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);
 return different===0;
};

/**
 * Check Stripe's t=,v1= HMAC SHA-256 over exact raw body bytes.
 * This contract takes raw text only because the worker JSON events are UTF-8,
 * does not parse/re-serialize JSON before signing and is test-mode scoped.
 */
export async function verifyStripeSignature(raw,header,secret,nowSeconds=Math.floor(Date.now()/1000)){
 if(typeof raw!=='string'||raw.length===0||raw.length>MAX_BODY_CHARS||
    typeof header!=='string'||header.length>2000||
    typeof secret!=='string'||!secret.startsWith('whsec_')||secret.length>300||
    !Number.isFinite(nowSeconds))return false;
 const parts=header.split(',').map(x=>x.trim());
 const times=parts.filter(x=>/^t=\d+$/.test(x));
 const signatures=parts.filter(x=>/^v1=[a-f0-9]{64}$/i.test(x));
 if(times.length!==1||!signatures.length)return false;
 const timestamp=Number(times[0].slice(2));
 if(!Number.isSafeInteger(timestamp)||Math.abs(nowSeconds-timestamp)>300)return false;
 const data=encoder.encode(timestamp+'.'+raw);
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const expected=hex(await crypto.subtle.sign('HMAC',key,data));
 return signatures.some(x=>equalHex(expected,x.slice(3).toLowerCase()));
}

export function classifySandboxSponsorCheckout(event,config={}){
 if(!event||event.type!=='checkout.session.completed'||event.livemode!==false||
    !validRef(event.id,'evt_')||
    (event.account!==undefined&&event.account!==config.accountId))return null;
 const s=event.data?.object;
 if(!s||s.object!=='checkout.session'||s.livemode!==false||
    !validRef(s.id,'cs_test_')||s.mode!=='payment'||s.payment_status!=='paid'||
    s.amount_total!==config.expectedAmountCents||
    s.currency!==config.expectedCurrency||
    !config.paymentLinkId||s.payment_link!==config.paymentLinkId)return null;
 const m=s.metadata||{};
 if(m.platform!=='QuantaPhi'||m.project_issue!=='1315'||
    m.environment!=='sandbox'||m.campaign_kind!=='sponsored_boost_pilot'||
    m.review_status!=='not_approved'||m.fulfillment!=='disabled')return null;
 return Object.freeze({
  eventId:event.id,sessionId:s.id,paymentLinkId:s.payment_link,
  amountCents:s.amount_total,currency:s.currency
 });
}
const reply=(status,json)=>Response.json(json,{status,headers:{'cache-control':'no-store'}});
export async function handleStripeSponsorSandboxWebhook(request,env,nowSeconds=Math.floor(Date.now()/1000)){
 if(request?.method!=='POST')return reply(405,{ok:false,error:'method_not_allowed'});
 if(!env?.SPONSOR_SANDBOX_DB||typeof env.STRIPE_TEST_WEBHOOK_SECRET!=='string'||
    !env.STRIPE_TEST_WEBHOOK_SECRET.startsWith('whsec_')||
    !/^plink_[A-Za-z0-9_]{6,100}$/.test(env.STRIPE_TEST_PAYMENT_LINK_ID||'')||
    !/^acct_[A-Za-z0-9]{6,100}$/.test(env.STRIPE_TEST_ACCOUNT_ID||'')){
  return reply(503,{ok:false,error:'sandbox_not_configured'});
 }
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>MAX_BODY_CHARS)return reply(413,{ok:false,error:'oversized_event'});
 let raw;
 try{raw=await request.text()}catch{return reply(400,{ok:false,error:'invalid_body'})}
 if(!raw||raw.length>MAX_BODY_CHARS)return reply(413,{ok:false,error:'oversized_event'});
 let authentic=false;
 try{authentic=await verifyStripeSignature(raw,request.headers.get('stripe-signature'),env.STRIPE_TEST_WEBHOOK_SECRET,nowSeconds)}catch{}
 if(!authentic)return reply(400,{ok:false,error:'invalid_signature'});
 let event;
 try{event=JSON.parse(raw)}catch{return reply(400,{ok:false,error:'invalid_json'})}
 const receipt=classifySandboxSponsorCheckout(event,{
  paymentLinkId:env.STRIPE_TEST_PAYMENT_LINK_ID,expectedAmountCents:10000,
  expectedCurrency:'usd',accountId:env.STRIPE_TEST_ACCOUNT_ID
 });
 if(!receipt)return reply(200,{ok:true,status:'ignored_nonmatching_test_event',canActivateAd:false,realMoney:false});
 try{
  const saved=await env.SPONSOR_SANDBOX_DB.prepare(
   'INSERT OR IGNORE INTO sponsor_stripe_sandbox_receipt '+
   '(event_id,session_id,payment_link_id,amount_cents,currency,recorded_at) VALUES (?,?,?,?,?,?)'
  ).bind(receipt.eventId,receipt.sessionId,receipt.paymentLinkId,receipt.amountCents,
   receipt.currency,new Date(nowSeconds*1000).toISOString()).run();
  const inserted=Number(saved?.meta?.changes)===1;
  return reply(200,{ok:true,status:inserted?'sandbox_receipt_recorded':'sandbox_duplicate_ignored',
   canActivateAd:false,realMoney:false});
 }catch{
  return reply(503,{ok:false,error:'test_receipt_ledger_unavailable',canActivateAd:false});
 }
}
export default {
 fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/webhook/stripe-sponsor-test')return reply(404,{ok:false,error:'not_found'});
  return handleStripeSponsorSandboxWebhook(request,env);
 }
};
