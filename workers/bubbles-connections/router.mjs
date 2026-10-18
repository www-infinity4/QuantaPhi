import {digest} from './vault.mjs';
import {PROVIDERS} from './authorization.mjs';
import {CONNECTOR_REQUIREMENTS} from './providers.mjs';
const ORIGINS = new Set(['https://quantaphi.org','https://www.quantaphi.org']);
export const PREFIX = '/api/bubbles/connections';
function json(origin,value,status = 200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',
    ...(ORIGINS.has(origin) ? {'Access-Control-Allow-Origin':origin} : {}),
    'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
}
export async function walletIdentity(request,env) {
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9._~-]{16,2048}$/.test(authorization)) throw Error('verified_wallet_required');
  if(authorization.startsWith('Bearer bc_')){
    if(!env.CONNECTIONS)throw Error('verified_wallet_required');
    return env.CONNECTIONS.get(env.CONNECTIONS.idFromName('connector-pairing-v1')).pairIdentity({token:authorization.slice(7)});
  }
  if (!env.BOT_WALLET?.fetch) throw Error('wallet_validation_unavailable');
  const response = await env.BOT_WALLET.fetch('https://wallet.internal/v1/wallet/state',{
    headers:{Authorization:authorization},signal:AbortSignal.timeout(9000)});
  if (!response.ok) throw Error('verified_wallet_required');
  const value = await response.json(), id = value?.user?.id;
  if (!value.ok || !((typeof id === 'string' && id.length > 0 && id.length < 160) || (Number.isSafeInteger(id) && id >= 0))) throw Error('verified_wallet_required');
  // Binding uses the authenticated device session, not browser-provided IDs.
  return {userId:String(id),sessionId:await digest(authorization)};
}
export function callbackPage(provider) {
  if (!['google','github'].includes(provider)) return new Response('Unknown provider',{status:404});
  const nonce = crypto.randomUUID();
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Return to Bubbles</title><body><h1>Return to Bubbles</h1><p id="status">Completing your account connection…</p><script nonce="${nonce}">
const params=new URLSearchParams(location.search);history.replaceState(null,'',location.pathname);
const targets=['https://quantaphi.org','https://www.quantaphi.org'];
if(window.opener){for(const origin of targets)window.opener.postMessage({type:'bubbles:oauth-return',provider:${JSON.stringify(provider)},state:params.get('state'),code:params.get('code'),error:params.has('error')?'provider_declined':null},origin);document.getElementById('status').textContent='Return to the Bubbles window to check the connection result.';}
else document.getElementById('status').textContent='The original Bubbles window is unavailable. Return to Bubbles and start Connect account again. No connection is confirmed here.';
</script></body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    'X-Content-Type-Options':'nosniff'}});
}
// resolveService is an internal dependency, selected only by verified user ID.
export async function handleConnections(request,env,resolveService) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  if (request.method === 'GET' && url.pathname === PREFIX+'/health') return json(origin,{ok:true,service:'bubbles-connections',version:2});
  const callback = url.pathname.match(/^\/api\/bubbles\/connections\/(google|github)\/callback$/);
  if (callback && request.method === 'GET') return callbackPage(callback[1]);
  // Browsers normally omit Origin for same-origin GET fetches. Accept only
  // their Fetch Metadata-confirmed same-origin reads, never originless writes
  // or cross-site reads. A bearer token is still required on protected routes.
  const browserSameOriginRead = request.method === 'GET' && !request.headers.has('Origin')
    && ORIGINS.has(url.origin) && request.headers.get('Sec-Fetch-Site') === 'same-origin';
  if (!ORIGINS.has(origin) && !browserSameOriginRead) return json(origin,{ok:false,error:'origin_not_allowed'},403);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,
    'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'}});
  try {
    if(url.pathname===PREFIX+'/pair/redeem'&&request.method==='POST'){
      if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json(origin,{ok:false,error:'json_required'},415);
      const raw=await request.text();if(raw.length>256)return json(origin,{ok:false,error:'too_large'},413);
      const body=JSON.parse(raw),pair=env.CONNECTIONS.get(env.CONNECTIONS.idFromName('connector-pairing-v1'));
      return json(origin,{ok:true,...await pair.redeemPair({code:body.code})});
    }
    const identity = await walletIdentity(request,env);
    if(url.pathname===PREFIX+'/pair/create'&&request.method==='POST'){
      if(request.headers.get('Authorization')?.startsWith('Bearer bc_'))throw Error('verified_wallet_required');
      const pair=env.CONNECTIONS.get(env.CONNECTIONS.idFromName('connector-pairing-v1'));
      return json(origin,{ok:true,...await pair.createPair(identity)});
    }
    if(url.pathname===PREFIX+'/pair/end'&&request.method==='POST'){
      const token=request.headers.get('Authorization')?.slice(7)||'';
      if(!token.startsWith('bc_'))throw Error('verified_wallet_required');
      return json(origin,await env.CONNECTIONS.get(env.CONNECTIONS.idFromName('connector-pairing-v1')).endPair({token}));
    }
    if (request.method === 'GET' && url.pathname === PREFIX+'/catalog') {
      const ready = env.CONNECTIONS_READY === true || env.CONNECTIONS_READY === 'true';
      return json(origin,{ok:true,providers:Object.keys(PROVIDERS).map(id=>({id,actions:PROVIDERS[id].actions,
        configured:ready && ((id==='google' && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET) ||
          (id==='github' && !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET)),requirement:CONNECTOR_REQUIREMENTS[id]}))});
    }
    if (!(env.CONNECTIONS_READY === true || env.CONNECTIONS_READY === 'true')) return json(origin,{ok:false,error:'connections_not_configured'},503);
    const service = await resolveService(identity.userId);
    if (request.method === 'GET' && url.pathname === PREFIX+'/accounts') return json(origin,{ok:true,accounts:await service.list(identity)});
    if (request.method !== 'POST') return json(origin,{ok:false,error:'not_found'},404);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json(origin,{ok:false,error:'json_required'},415);
    if (Number(request.headers.get('Content-Length')) > 8192) return json(origin,{ok:false,error:'too_large'},413);
    const raw = await request.text(); if (raw.length > 8192) return json(origin,{ok:false,error:'too_large'},413);
    let body; try {body = JSON.parse(raw);} catch {return json(origin,{ok:false,error:'invalid_json'},400);}
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(origin,{ok:false,error:'invalid_json'},400);
    // Explicit field selection prevents supplied userId/sessionId from winning.
    if (url.pathname === PREFIX+'/start') return json(origin,{ok:true,...await service.start({...identity,provider:body.provider,actions:body.actions})});
    if (url.pathname === PREFIX+'/complete') {const account=await service.complete({...identity,provider:body.provider,state:body.state,code:body.code});if(account?.connectionError)throw Error(account.connectionError);return json(origin,{ok:true,account});}
    if (url.pathname === PREFIX+'/disconnect') return json(origin,await service.disconnect({userId:identity.userId,id:body.id}));
    if (url.pathname === PREFIX+'/refresh') return json(origin,{ok:true,account:await service.refresh({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/read') return json(origin,await service.read({userId:identity.userId,id:body.id,operation:body.operation,args:body.args}));
    if (url.pathname === PREFIX+'/select-resource') return json(origin,await service.selectResource({userId:identity.userId,id:body.id,kind:body.kind,resourceId:body.resourceId}));
    return json(origin,{ok:false,error:'not_found'},404);
  } catch (error) {
    const expected = /^(?:expiring_token_required|provider_token_invalid|provider_response_invalid|provider_identity_invalid|github_exchange_rejected|github_exchange_\d+|github_identity_rejected|github_identity_\d+|pairing_invalid_or_expired|verified_wallet_required|wallet_validation_unavailable|connections_not_configured|provider_not_configured|unsupported_action|callback_invalid|callback_session_mismatch|state_invalid_or_used|state_expired|connection_cancelled|connection_invalid|connection_not_found|connection_not_verified|connection_required|credential_unavailable|consent_required|refresh_in_progress|refresh_required|reconnect_required|resource_selection_required|range_invalid|time_invalid|provider_response_too_large|too_many_requests|google_read_http_\d+)$/;
    const message = expected.test(error.message) ? error.message : 'connection_operation_failed';
    const status = message === 'verified_wallet_required' ? 401 : message === 'too_many_requests' ? 429 : /unavailable|not_configured|operation_failed/.test(message) ? 503 : 400;
    return json(origin,{ok:false,error:message},status);
  }
}
