// Bubbles Verification Center: read-only, wallet-scoped provider evidence.
// Never infer identity, owner status, or execution authority from a dashboard
// login, OAuth return URL, static catalog, or remembered browser state.
const REQUIRED=['google','github','cloudflare'];
const labels={google:'Google',github:'GitHub',cloudflare:'Cloudflare'};
const goodTime=value=>Number.isFinite(value)&&value>0?value:null;
export function summarizeProviderVerification(catalog,accountResponse,{now=Date.now(),verifiedSession=false}={}){
 const trusted=verifiedSession===true&&Array.isArray(catalog?.providers)&&
   Array.isArray(accountResponse?.accounts);
 return REQUIRED.map(id=>{
  const config=trusted?catalog.providers.find(p=>p?.id===id):null;
  const available=Array.isArray(config?.actions)?config.actions.filter(a=>typeof a==='string'&&a.length<100):[];
  const candidates=trusted?accountResponse.accounts.filter(a=>a?.provider===id):[];
  const live=candidates.find(a=>a.status==='connected'&&Number.isFinite(a.expiresAt)&&a.expiresAt>now+30000);
  const latest=live||candidates.slice().sort((a,b)=>(goodTime(b.updatedAt)||0)-(goodTime(a.updatedAt)||0))[0];
  const expired=!!latest&&latest.status==='connected'&&(!Number.isFinite(latest.expiresAt)||latest.expiresAt<=now+30000);
  const status= !trusted?'unavailable':live?'connected':
   latest?.status==='revoked'||latest?.status==='blocked'?'blocked':
   expired?'expired':config?.configured===false?'unavailable':'not_connected';
  const grantedActions=status==='connected'&&Array.isArray(live.grantedActions)
   ?[...new Set(live.grantedActions.filter(a=>available.includes(a)))]:[];
  return {
   id,label:labels[id],status,connected:status==='connected',
   accountLabel:status==='connected'&&typeof live.label==='string'?live.label:'',
   grantedActions,
   missingActions:status==='connected'?available.filter(a=>!grantedActions.includes(a)):[],
   // updatedAt is a storage record timestamp, not evidence of a live API probe.
   updatedAt:goodTime(latest?.updatedAt),
   // Reserve "last verified" for a real server-supplied verification timestamp.
   verifiedAt:goodTime(latest?.verifiedAt),
   expiresAt:goodTime(latest?.expiresAt),
   reconnectAvailable:trusted&&config?.configured===true,
   explanation:!trusted?'Wallet-bound connection check could not be verified.':
    status==='connected'?'Account connection confirmed in wallet-bound server records. Capability grants are separate.':
    status==='expired'?'Provider session has expired. Reconnect to restore access.':
    status==='blocked'?'Provider authorization is blocked or revoked. Reconnect only with consent.':
    config?.configured===false?'Provider OAuth application or required configuration is unavailable.':
    'No active wallet-bound account connection has been verified.'
  };
 });
}
