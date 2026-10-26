import {cloudStarCoinBackup} from './starcoin-backup.mjs';
import {digest} from './vault.mjs';
import {PROVIDERS} from './authorization.mjs';
import {inspectConnectionIntegrity} from './integra.mjs';
import {CONNECTOR_REQUIREMENTS,cloudflareAvailableActions} from './providers.mjs';
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
  if (!['google','github','cloudflare'].includes(provider)) return new Response('Unknown provider',{status:404});
  const nonce = crypto.randomUUID();
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Return to Bubbles</title><body><h1>Return to Bubbles</h1><p id="status">Completing your account connection…</p><p><a href="https://quantaphi.org/bubbles.html" rel="noopener noreferrer">Open the current Bubbles application</a></p><script nonce="${nonce}">
const params=new URLSearchParams(location.search);
// Reject ambiguous provider callbacks before importing or exchanging any code.
// Capture the fragment check BEFORE replaceState removes it from location.
const invalid=params.getAll('state').length!==1||params.getAll('code').length>1||params.getAll('error').length>1||
 (params.has('code')&&params.has('error'))||Boolean(location.hash);
history.replaceState(null,'',location.pathname);
window.QuantaCloudConnectionDisableAutoRecovery=true;
if(invalid){document.getElementById('status').textContent='Invalid sign-in return. Open Bubbles and start sign-in again.';}
else import('/bubbles-oauth-return.mjs?v=20261025-required1').then(({completeBubblesReturn})=>completeBubblesReturn({provider:${JSON.stringify(provider)},state:params.get('state'),code:params.get('code'),error:params.has('error')})).catch(()=>{document.getElementById('status').textContent='Could not load account verification. Open the current Bubbles application and start sign-in again.';});
</script></body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'none'; script-src 'self' 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
    'X-Content-Type-Options':'nosniff'}});
}
// resolveService is an internal dependency, selected only by verified user ID.
export async function handleConnections(request,env,resolveService) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  if (request.method === 'GET' && url.pathname === PREFIX+'/health') return json(origin,{ok:true,service:'bubbles-connections',version:3,entryPolicy:'github-cloudflare-required-v1',integrityValidator:'integra-v1'});
  const callback = url.pathname.match(/^\/api\/bubbles\/connections\/(google|github|cloudflare)\/callback$/);
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
    const oauthClientScopes=cloudflareAvailableActions(env.CLOUDFLARE_OAUTH_ALLOWED_SCOPES);
    const cloudflareAppReady=Boolean(env.CLOUDFLARE_CLIENT_ID&&env.CLOUDFLARE_CLIENT_SECRET&&
      oauthClientScopes.includes('account.read'));
    const cloudflareFullReady=cloudflareAppReady&&
      ['account.read','projects.build','ledger.read','projects.full'].every(a=>oauthClientScopes.includes(a));
    if (request.method === 'GET' && url.pathname === PREFIX+'/catalog') {
      const ready = env.CONNECTIONS_READY === true || env.CONNECTIONS_READY === 'true';
      return json(origin,{ok:true,starcoinBackupEnabled:Boolean(ready&&env.STARQUEST_LEDGER?.fetch&&env.BOT_WALLET?.fetch),providers:Object.keys(PROVIDERS).map(id=>({id,actions:id==='cloudflare'?oauthClientScopes:PROVIDERS[id].actions,
        configured:ready && ((id==='google' && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET) ||
          (id==='github' && !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET) ||
          (id==='cloudflare' && cloudflareAppReady)),
        ...(id==='cloudflare'?{fullProjectConfigured:ready&&cloudflareFullReady,
          setupRequired:!cloudflareAppReady?'oauth_client_not_configured':!cloudflareFullReady?'oauth_client_full_scopes_not_registered':null}:{}),
        requirement:CONNECTOR_REQUIREMENTS[id]}))});
    }
    if (!(env.CONNECTIONS_READY === true || env.CONNECTIONS_READY === 'true')) return json(origin,{ok:false,error:'connections_not_configured'},503);
    const service = await resolveService(identity.userId);
    // Integra checks trusted, wallet-partitioned vault records. This status is
    // application entry policy; each executor retains its own authorization.
    if (request.method === 'GET' && url.pathname === PREFIX+'/gate/status') {
      return json(origin,inspectConnectionIntegrity({accounts:await service.gateStatus(identity),
        configured:{github:Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET),cloudflare:cloudflareAppReady},
        cloudflareFullReady}));
    }
    if (request.method === 'GET' && url.pathname === PREFIX+'/accounts') return json(origin,{ok:true,accounts:await service.list(identity)});
    if (request.method !== 'POST') return json(origin,{ok:false,error:'not_found'},404);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json(origin,{ok:false,error:'json_required'},415);
    if (Number(request.headers.get('Content-Length')) > 8192) return json(origin,{ok:false,error:'too_large'},413);
    const raw = await request.text(); if (raw.length > 8192) return json(origin,{ok:false,error:'too_large'},413);
    let body; try {body = JSON.parse(raw);} catch {return json(origin,{ok:false,error:'invalid_json'},400);}
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(origin,{ok:false,error:'invalid_json'},400);
    if (url.pathname === PREFIX+'/github/starcoins/create-repository')
      return json(origin,{ok:true,...await service.createStarCoinRepository({userId:identity.userId,id:body.id})});
    if(url.pathname===PREFIX+'/github/starcoins/backup'||url.pathname===PREFIX+'/github/starcoins/verify'){
      const authorization=request.headers.get('Authorization')||'';
      if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(authorization))
        throw Error('starcoin_verified_device_required');
      if(!env.STARQUEST_LEDGER?.fetch||!env.BOT_WALLET?.fetch)
        throw Error('starcoin_cloud_unavailable');
      const [sr,wr]=await Promise.all([
        env.STARQUEST_LEDGER.fetch('https://starquest.internal/v1/state',
          {headers:{Authorization:authorization},signal:AbortSignal.timeout(12000)}),
        env.BOT_WALLET.fetch('https://wallet.internal/v1/wallet/state',
          {headers:{Authorization:authorization},signal:AbortSignal.timeout(12000)})
      ]);
      if(!sr.ok||!wr.ok)throw Error('starcoin_cloud_unavailable');
      const [star,wallet]=await Promise.all([sr.json(),wr.json()]);
      if(!star.ok||!wallet.ok)throw Error('starcoin_cloud_unavailable');
      const snapshot=await cloudStarCoinBackup(identity.userId,wallet,star.state);
      return json(origin,{ok:true,...await service.starCoinBackup({
        userId:identity.userId,id:body.id,repository:body.repository,snapshot,
        mode:url.pathname.endsWith('/verify')?'verify':'write'})});
    }
    // Explicit field selection prevents supplied userId/sessionId from winning.
    if (url.pathname === PREFIX+'/cloudflare/accounts') return json(origin,{ok:true,...await service.cloudflareAccounts({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/cloudflare/select-account') return json(origin,{ok:true,...await service.selectCloudflareAccount({userId:identity.userId,id:body.id,accountId:body.accountId})});
    if (url.pathname === PREFIX+'/github/test') return json(origin,{ok:true,...await service.githubConnectionTest({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/github/repositories') return json(origin,{ok:true,...await service.githubRepositories({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/start') return json(origin,{ok:true,...await service.start({...identity,provider:body.provider,actions:body.actions})});
    if (url.pathname === PREFIX+'/complete') {const account=await service.complete({...identity,provider:body.provider,state:body.state,code:body.code});if(account?.connectionError)throw Error(account.connectionError);return json(origin,{ok:true,account});}
    if (url.pathname === PREFIX+'/disconnect') return json(origin,await service.disconnect({userId:identity.userId,id:body.id}));
    if (url.pathname === PREFIX+'/refresh') return json(origin,{ok:true,account:await service.refresh({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/read') return json(origin,await service.read({userId:identity.userId,id:body.id,operation:body.operation,args:body.args}));
    if (url.pathname === PREFIX+'/select-resource') return json(origin,await service.selectResource({userId:identity.userId,id:body.id,kind:body.kind,resourceId:body.resourceId}));
    return json(origin,{ok:false,error:'not_found'},404);
  } catch (error) {
    const expected = /^(?:starcoin_account_identity_mismatch|starcoin_state_invalid|starcoin_sources_disagree|starcoin_duplicate_receipt|starcoin_cloud_unavailable|starcoin_verified_device_required|github_private_write_not_verified|github_backup_http_\d+|backup_(?:account_mismatch_review_required|mismatch_review_required|malformed_review_required|commit_conflict_retry|commit_unverified|repository_invalid|repository_already_selected|not_configured|invalid_request)|connection_complete_(?:state|exchange|seal|store|unknown)_(?:timeout|type|internal)(?:_(?:token_redirect|login_redirect|external_redirect|other_redirect|receiver|context|redirect|headers|url|timeout|network|function|unknown))?|pairing_invalid_or_expired|verified_wallet_required|wallet_validation_unavailable|connections_not_configured|provider_not_configured|unsupported_action|callback_invalid|callback_session_mismatch|state_invalid_or_used|state_expired|connection_cancelled|connection_invalid|connection_not_found|connection_not_verified|connection_required|credential_unavailable|consent_required|refresh_in_progress|refresh_required|reconnect_required|resource_selection_required|range_invalid|time_invalid|provider_response_too_large|too_many_requests|google_read_http_\d+|cloudflare_client_scopes_unavailable|cloudflare_account_(?:invalid|not_authorized)|cloudflare_accounts_http_\d+)$/;
    const message = expected.test(error.message) ? error.message : 'connection_operation_failed';
    const status = ['verified_wallet_required','starcoin_verified_device_required'].includes(message) ? 401 : message === 'too_many_requests' ? 429 : /unavailable|not_configured|operation_failed/.test(message) ? 503 : 400;
    return json(origin,{ok:false,error:message},status);
  }
}
