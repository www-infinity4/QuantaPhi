// A callback result is a non-authoritative UI hint. Only the wallet-bound
// server handoff can confirm an account. Never store state, code or token here.
export const OAUTH_RETURN_NOTE='bubbles:oauth-return-note:v1';
export function resumeAuthReturn(host=window) {
 try {
  const query=new URLSearchParams(host.location?.search||'');
  const result=query.get('result');
  const callbackProvider=String(host.location?.pathname||'').match(/\/api\/bubbles\/connections\/(google|github|cloudflare)\/callback$/)?.[1]||null;
  const saved=JSON.parse(host.sessionStorage?.getItem('bubbles:oauth-pending:v1')||'null');
  const provider=callbackProvider||saved?.provider||'cloudflare';
  if(result==='received'||result==='failed'||result==='declined'){
   try {host.sessionStorage?.setItem(OAUTH_RETURN_NOTE,
    JSON.stringify({provider,result,at:Date.now()}));}catch{}
  }
  // A provider failure must remain visible. Never silently turn "denied" into
  // a fresh login screen.
  if(result==='failed'||result==='declined')return false;
  const pending=saved;
  if(!pending||!['github','cloudflare','google'].includes(pending.provider)||
     !/^[A-Za-z0-9_-]{43}$/.test(pending.state)||!Number.isFinite(pending.expiresAt)||
     pending.expiresAt<=Date.now()||pending.expiresAt>Date.now()+300000){
   const message=host.document?.querySelector?.('.auth-return-card p');
   if(message&&result==='received')
    message.textContent='Cloudflare returned, but this browser no longer has the matching Bubbles sign-in session. Reopen Bubbles in the original Chrome tab or app; do not assume authorization succeeded.';
   return false;
  }
  if(callbackProvider&&callbackProvider!==pending.provider)return false;
  const destination=pending.returnPath==='/bubbles-accounts.html'?'/bubbles-accounts.html':'/bubbles.html';
  host.location.replace(destination);
  return true;
 }catch{return false;}
}
if(typeof window!=='undefined')resumeAuthReturn();
