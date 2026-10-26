// Resume only the initiating tab's short-lived handoff. No provider codes,
// wallet credentials, cross-window messages, or arbitrary destinations.
export function resumeAuthReturn(host=window) {
  try {
    const pending=JSON.parse(host.sessionStorage.getItem('bubbles:oauth-pending:v1')||'null');
    if(!pending||!['github','cloudflare','google'].includes(pending.provider)||
       !/^[A-Za-z0-9_-]{43}$/.test(pending.state)||!Number.isFinite(pending.expiresAt)||
       pending.expiresAt<=Date.now()||pending.expiresAt>Date.now()+300000)return false;
    const destination=pending.returnPath==='/bubbles-accounts.html'?'/bubbles-accounts.html':'/bubbles.html';
    host.location.replace(destination);
    return true;
  }catch{return false;}
}
if(typeof window!=='undefined')resumeAuthReturn();
