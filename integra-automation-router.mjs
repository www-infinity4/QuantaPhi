/* Integra automation selection: capability planning, not execution.
 * ChatGPT plugins, Grok Bot profiles and owner browser sessions are NOT transferable
 * to QuantaPhi visitors. The backend must independently verify each user grant.
 */
const definitions=[
 {id:'questions',title:'Answer customer questions',preferred:'Knowledge base + approved Grok or Bubbles model',need:'Verified first-party knowledge and a tenant-authorized AI model',data:['question topic','answer source','resolution status'],requires:['knowledge','model'],cost:'Low when answers reuse verified first-party content'},
 {id:'crm',title:'Manage leads and customer requests',preferred:'HubSpot or Zoho official CRM API',need:'The business owner connects their own CRM with limited scopes',data:['voluntary lead source','contact consent','case status'],requires:['crm_api'],cost:'Provider API limits and subscription, if applicable'},
 {id:'commerce',title:'Product and order assistance',preferred:'Official store/catalog/order API',need:'Per-merchant OAuth; separate customer approval for purchases and refunds',data:['catalog item','inventory checked time','order status'],requires:['store_api'],cost:'Provider API fees and authorized transaction costs'},
 {id:'analytics',title:'Measure business results',preferred:'First-party consented events, Mixpanel or analytics API',need:'Consent, disclosure, per-tenant collection policy and real event instrumenting',data:['card_open','action_click','request_completed'],requires:['first_party_analytics','analytics_api'],cost:'Measured event volume and optional analytics service fees'},
 {id:'builder',title:'Build and improve a website',preferred:'Scoped GitHub and Cloudflare adapters',need:'Authorized repository, exact CI and deployment approval',data:['commit ID','test result','deploy receipt'],requires:['github_api','cloudflare_api'],cost:'Service quotas and any approved deployment costs'},
 {id:'schedule',title:'Handle appointments and follow-up',preferred:'Authorized calendar/email provider APIs',need:'Consent for the customer details and explicit approval before sending',data:['appointment status','confirmation time','delivery result'],requires:['calendar_api','mail_api'],cost:'Provider quota; no browser needed for ordinary actions'},
 {id:'x-replies',title:'Respond to people on X',preferred:'Official X/Grok Bot tools with approved automation policy',need:'Per-account consent, recipient opt-in, and prior written X approval for automated AI replies',data:['original post URL','reply consent','verified reply permalink'],requires:['x_api','x_ai_reply_approval'],cost:'X API or Grok plan, if enabled; no unattended website scripting'},
 {id:'browser',title:'Complete a special website task',preferred:'Official site API first; consented TinyFish browser only as exception',need:'Site-specific permission, visible task scope, rate quote and fixed spending cap',data:['site','action type','success/failure receipt'],requires:['site_api','browser_approval'],cost:'Potential paid steps and browser minutes; do not auto-reload'}
];
export const INTEGRA_AUTOMATION_CASES=Object.freeze(definitions.map(x=>Object.freeze({...x,data:Object.freeze([...x.data]),requires:Object.freeze([...x.requires])})));
const record=id=>INTEGRA_AUTOMATION_CASES.find(x=>x.id===id)||null;
const has=(grants,key)=>grants?.[key]===true;
const plan=(entry,status,route,reason)=>Object.freeze({id:entry.id,title:entry.title,preferred:entry.preferred,route,status,reason,needed:entry.need,dataPoints:[...entry.data],cost:entry.cost,executed:false,authorized:false});
export function quoteTinyFishWork({steps,minutes,stepUsd,minuteUsd}={}){
 if(!Number.isInteger(steps)||steps<0||steps>100||!Number.isFinite(minutes)||minutes<0||minutes>60||
   !Number.isFinite(stepUsd)||stepUsd<0||!Number.isFinite(minuteUsd)||minuteUsd<0)return null;
 return Math.ceil((steps*stepUsd+minutes*minuteUsd)*10000)/10000;
}
export function planIntegraAutomation(id,{grants={},channel='website',approval={},quote={}}={}){
 const entry=record(id);if(!entry)return null;
 switch(id){
  case 'questions':
   if(channel==='x'&&has(grants,'x_grok_bot'))return plan(entry,'account_verification_required','grok_bot_x','Official X/Grok Bot account link is reported; verify the requesting account and provider run independently. Not a website chat API.');
   if(has(grants,'knowledge')&&has(grants,'grok_model'))return plan(entry,'ready_for_verified_adapter','grok_model','First-party knowledge and per-tenant Grok model access are declared; server must verify grants before answering.');
   if(has(grants,'knowledge')&&has(grants,'bubbles_model'))return plan(entry,'ready_for_verified_adapter','bubbles_model','Authorized model with first-party knowledge; answer with citations and a human fallback.');
   return plan(entry,'connection_required','knowledge_and_model','Create a tenant-specific knowledge base and connect a supported conversation model.');
  case 'crm':
   return has(grants,'crm_api')?plan(entry,'ready_for_verified_adapter','crm_api','Use scoped CRM records; collect a contact only with disclosed purpose and consent.'):plan(entry,'connection_required','crm_api','Connect the business customer’s own CRM before reading or updating records.');
  case 'commerce':
   return has(grants,'store_api')?plan(entry,'ready_for_verified_adapter','store_api','Use authoritative store API; buying and refunds require separate confirmation.'):plan(entry,'connection_required','store_api','No authorized store connector. Do not imitate an order, checkout or receipt.');
  case 'analytics':
   if(!has(grants,'measurement_consent'))return plan(entry,'consent_required','analytics','Collect no visitor-level behavior before privacy notice and required consent.');
   return has(grants,'first_party_analytics')?plan(entry,'ready_for_verified_adapter','first_party_analytics','Measure only named, disclosed, minimal events and valid retention period.')
    :has(grants,'analytics_api')?plan(entry,'ready_for_verified_adapter','analytics_api','Use an authorized per-tenant analytics API; no invented data.')
    :plan(entry,'connection_required','analytics','Instrument consented first-party events or connect an analytics provider.');
  case 'builder':
   if(has(grants,'github_api')&&has(grants,'cloudflare_api'))return plan(entry,'approval_required','github_cloudflare','Use exact repository and CI receipts; merge/deploy only after release approvals.');
   return plan(entry,'connection_required','github_cloudflare','Need owner-scoped repository and deployment access; visitor cannot borrow site-owner permissions.');
  case 'schedule':
   if(has(grants,'calendar_api')&&has(grants,'mail_api'))return plan(entry,'approval_required','calendar_mail','Read availability only within scope; user must approve sending a message or creating the booking.');
   return plan(entry,'connection_required','calendar_mail','Connect an authorized calendar and mail provider.');
  case 'x-replies':
   if(!has(grants,'x_ai_reply_approval'))return plan(entry,'platform_approval_required','x_ai_replies_disabled','Automated AI replies remain disabled without documented prior written X approval.');
   if(!has(grants,'x_api')||!has(grants,'x_recipient_opt_in'))return plan(entry,'consent_required','x_ai_replies_disabled','Verified account authorization, recipient opt-in and opt-out controls are required.');
   return plan(entry,'approval_required','x_api_reply','Require a verified recipient, one reply per opted-in interaction and platform compliance before API write.');
  case 'browser':{
   if(has(grants,'site_api'))return plan(entry,'ready_for_verified_adapter','site_api','Prefer official site connector; browser cost unnecessary.');
   const total=quoteTinyFishWork(quote);
   if(!has(grants,'browser_approval')||approval.confirmed!==true)return plan(entry,'consent_required','browser_disabled','No browser run without explicit per-task approval and permitted site scope.');
   if(!Array.isArray(approval.allowedHosts)||approval.allowedHosts.length!==1||typeof approval.allowedHosts[0]!=='string'||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(approval.allowedHosts[0]))
    return plan(entry,'site_scope_required','browser_disabled','Provide exactly one verified authorized target host for this browser task.');
   if(total===null||!Number.isFinite(approval.maxUsd)||approval.maxUsd<=0||total>approval.maxUsd)
    return plan(entry,'budget_required','browser_disabled','No verified per-task quote within the explicit spending cap.');
   return plan(entry,'approval_required','tinyfish_exception','Quoted amount $'+total.toFixed(4)+'; backend must recheck consent, site terms, actual metering and spending cap before any run.');
  }
  default:return null;
 }
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function mountIntegraAutomationGuide(root){
 if(!root||typeof document==='undefined')return null;
 const panel=el('details','qcx-integra-business');
 const title=el('summary','','Build your own Integra · Business automation');
 const note=el('p','qcx-integra-business-note','Choose a job to see the best tool and what must be connected. This is a planning guide, not a connected business or Grok Bot account.');
 const label=el('label','qcx-integra-business-label','Business task');
 const select=el('select','qcx-integra-business-select');
 select.setAttribute('aria-label','Choose a business automation task');
 for(const item of INTEGRA_AUTOMATION_CASES){const option=el('option','',item.title);option.value=item.id;select.append(option);}
 label.append(select);
 const output=el('div','qcx-integra-business-result');output.setAttribute('aria-live','polite');
 const draw=()=>{
  const entry=INTEGRA_AUTOMATION_CASES.find(x=>x.id===select.value)||INTEGRA_AUTOMATION_CASES[0];
  const result=planIntegraAutomation(entry.id);
  const rows=[
   ['Suggested tool',entry.preferred],
   ['Before it can act',result.needed],
   ['Useful business data points',entry.data.join(' · ')],
   ['Cost guidance',entry.cost]
  ];
  output.replaceChildren();
  for(const [k,v] of rows){const row=el('p','', '');row.append(el('strong','',k+': '),document.createTextNode(v));output.append(row);}
  output.append(el('p','qcx-integra-business-warning','Status: requires a separate per-user connection/approval. No data collected and no external action performed.'));
 };
 select.addEventListener('change',draw);draw();panel.append(title,note,label,output);root.append(panel);return panel;
}
