import {cloudStarCoinBackup} from './starcoin-backup.mjs';
import {digest} from './vault.mjs';
import {PROVIDERS} from './authorization.mjs';
import {safeConnectionFailure} from './completion.mjs';
import {CONNECTOR_REQUIREMENTS,cloudflareAvailableActions,cloudflareScopeInventory,resolveCloudflareScopeConfig} from './providers.mjs';
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
// Only constant, non-secret categories may be reflected from OAuth callbacks.
// Never expose state, authorization code, user ID, or provider descriptions.
const OAUTH_RETURN_REASONS=Object.freeze({
  callback_missing_code:'Cloudflare returned without an authorization code.',
  callback_state_invalid:'The login session could not be matched to the authorization return.',
  callback_handoff_failed:'Cloudflare returned, but the Bubbles authorization handoff could not finish. The Worker may be unavailable.',
  callback_handoff_state_invalid:'Cloudflare returned, but the original Bubbles sign-in session expired or was no longer available.',
  callback_handoff_conflict:'Cloudflare returned an authorization callback conflicting with one already saved. Sign in again to avoid reusing an earlier code.',
  callback_handoff_decrypt_failed:'Bubbles could not decrypt the saved authorization session. Check the connection keyring without replacing its keys.',
  callback_handoff_encrypt_failed:'Bubbles could not encrypt the returned authorization. Check the connection keyring without resetting it.',
  callback_handoff_store_failed:'Bubbles could not write the encrypted authorization to its account storage.',
  invalid_scope:'Cloudflare rejected the requested permission combination.',
  invalid_request:'Cloudflare rejected the authorization request.',
  unauthorized_client:'Cloudflare did not authorize this application for sign-in.',
  access_denied:'Cloudflare authorization was declined.',
  server_error:'Cloudflare reported an authorization service error.',
  temporarily_unavailable:'Cloudflare authorization is temporarily unavailable.',
});
const HANDOFF_FAILURE_REASONS=Object.freeze({
  state_invalid:'callback_handoff_state_invalid',
  conflicting_callback:'callback_handoff_conflict',
  decrypt:'callback_handoff_decrypt_failed',
  encrypt:'callback_handoff_encrypt_failed',
  storage:'callback_handoff_store_failed',
  unavailable:'callback_handoff_failed',
});
export function callbackPage(provider,result='',reason='') {
  if(!['google','github','cloudflare'].includes(provider))return new Response('Unknown provider',{status:404});
  const details=Object.hasOwn(OAUTH_RETURN_REASONS,reason)?OAUTH_RETURN_REASONS[reason]:null;
  const message=result==='received'
    ? 'Authorization received securely. Return to Bubbles to verify and finish connecting your account.'
    : result==='declined'
      ? 'Cloudflare declined the requested access. No authorization was completed. Return to Bubbles to review your connection.'
    : result==='failed'
      ? 'The authorization could not be received. Return to Bubbles and retry the sign-in.'
      : 'Return to Bubbles to check your account connection.';
  const detailLine=details?'<p role="alert">'+details+'</p>':'';
  // The callback has already redirected away from the provider code. Offer
  // user-initiated navigation to the registered Android return intent or to
  // the Chrome/PWA account page. Neither link carries OAuth state or tokens.
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f4f0"><title>Return to Bubbles</title><link rel="stylesheet" href="/bubbles-auth.css?v=20261026-oracle-auth1"></head><body class="bubbles-auth-page"><main class="bubbles-auth-shell"><article class="auth-return-card"><h1>Return to Bubbles</h1><p>'+message+'</p>'+detailLine+'<p><a class="auth-action auth-primary" href="/bubbles.html">Continue in Bubbles</a><a class="auth-action" href="quantaphi-bubbles://return">Return to Bubbles Android app</a></p><p><a href="/bubbles-accounts.html">Account connections</a></p><p class="auth-intro">Connection is not confirmed until Bubbles checks your account securely.</p></article></main><script type="module" src="/bubbles-auth-return.mjs?v=20261026-oauth-finalize2"></script></body></html>';
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
    'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    'X-Content-Type-Options':'nosniff'}});
}
// resolveService is an internal dependency, selected only by verified user ID.
export async function handleConnections(request,env,resolveService) {
  const url = new URL(request.url), origin = request.headers.get('Origin') || '';
  const cloudflareScopes=resolveCloudflareScopeConfig(env);
  if (request.method === 'GET' && url.pathname === PREFIX+'/health') return json(origin,{ok:true,service:'bubbles-connections',version:2});
  // Public configuration proof only. No account identity, token, or user data.
  if(request.method==='GET'&&url.pathname===PREFIX+'/scope-inventory'){
    const ready=env.CONNECTIONS_READY===true||env.CONNECTIONS_READY==='true';
    const clientId=String(env.CLOUDFLARE_CLIENT_ID||'');
    const configured=ready&&/^[a-f0-9]{32}$/i.test(clientId);
    const inventory=cloudflareScopeInventory(cloudflareScopes);
    return json(origin,{ok:true,configured,clientIdPrefix:configured?clientId.slice(0,16):null,
      scopeInventory:{serverAllowlistCount:inventory.serverAllowlistCount,
        signInRequestScopeCount:inventory.signInRequestScopeCount,
        supportsChunkedAllowlist:true}});
  }
  const callback = url.pathname.match(/^\/api\/bubbles\/connections\/(google|github|cloudflare)\/callback$/);
  if(callback && request.method==='GET'){
    const provider=callback[1],state=url.searchParams.get('state');
    if(!state)return callbackPage(provider,url.searchParams.get('result')||'',url.searchParams.get('reason')||'');
    let result='failed',reason='callback_state_invalid';
    try{
      const code=url.searchParams.get('code'),denied=url.searchParams.has('error');
      if(!denied&&!code){reason='callback_missing_code';throw Error('callback_invalid');}
      const registry=env.CONNECTIONS.get(env.CONNECTIONS.idFromName('oauth-state-registry-v1'));
      let locator;
      try{locator=await registry.lookupOAuthState({state,provider});}
      catch{reason='callback_state_invalid';throw Error('state_invalid_or_used');}
      const service=await resolveService(locator.userId);
      reason='callback_handoff_failed';
      const handoff=await service.handoff({userId:locator.userId,provider,state,
        ...(denied?{error:true}:{code})});
      if(handoff?.received!==true){
        reason=Object.hasOwn(HANDOFF_FAILURE_REASONS,handoff?.failure)
          ?HANDOFF_FAILURE_REASONS[handoff.failure]:'callback_handoff_failed';
        throw Error('handoff_unavailable');
      }
      const errorCode=url.searchParams.get('error')||'';
      result=denied?(errorCode==='access_denied'?'declined':'failed'):'received';
      reason=denied&&Object.hasOwn(OAUTH_RETURN_REASONS,errorCode)?errorCode:'';
    }catch{
      // No OAuth state, code, user identity or untrusted provider text may
      // appear in the URL, logs or browser response.
    }
    return new Response(null,{status:303,headers:{Location:PREFIX+'/'+provider+'/callback?result='+result+(reason?'&reason='+encodeURIComponent(reason):''),
      'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
  }
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
    // Application identity is verified by Unified Wallet. Provider token
    // storage and OAuth configuration are separate from this sign-in.
    if(request.method==='GET'&&url.pathname===PREFIX+'/session')
      return json(origin,{ok:true,walletVerified:true});
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
    const oauthClientScopes=cloudflareAvailableActions(cloudflareScopes);
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
        ...(id==='cloudflare'?{scopeInventory:cloudflareScopeInventory(cloudflareScopes),
          clientIdPrefix:ready&&env.CLOUDFLARE_CLIENT_ID?String(env.CLOUDFLARE_CLIENT_ID).slice(0,16):null,
          fullProjectConfigured:ready&&cloudflareFullReady,
          setupRequired:!cloudflareAppReady?'oauth_client_not_configured':!cloudflareFullReady?'oauth_client_full_scopes_not_registered':null}:{}),
        requirement:CONNECTOR_REQUIREMENTS[id]}))});
    }
    if (!(env.CONNECTIONS_READY === true || env.CONNECTIONS_READY === 'true')) return json(origin,{ok:false,error:'connections_not_configured'},503);
    const service = await resolveService(identity.userId);
    // Stage 2 is a read-only pre-chat gate while live OAuth provisioning is
    // incomplete. Only records resolved from the verified StarQuest session
    // count, and the server refreshes expired provider credentials.
    if (request.method === 'GET' && url.pathname === PREFIX+'/gate/status') {
      const accounts=await service.gateStatus(identity);
      const available=id=>id==='github'
        ? Boolean(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET)
        : cloudflareAppReady;
      const required={github:[],cloudflare:oauthClientScopes.includes('owner.full')
        ? ['owner.full'] : ['account.read','projects.build','ledger.read','projects.full']};
      const state=id=>{
        const configured=available(id);
        const candidates=accounts.filter(x=>x.provider===id);
        const matching=candidates.find(x=>x.status==='connected' &&
          Number.isFinite(x.expiresAt)&&x.expiresAt>Date.now()+30000);
        const missingActions=required[id].filter(a=>!matching?.grantedActions?.includes(a));
        return {configured,connected:Boolean(configured&&matching),
          permissionsApproved:Boolean(configured&&matching&&missingActions.length===0),
          label:configured&&matching?matching.label:null,
          missingActions:matching?missingActions:[],
          reconnectRequired:candidates.length>0&&!matching,
          ...(id==='cloudflare'?{fullProjectConfigured:cloudflareFullReady,
            authorizationActions:oauthClientScopes,
            scopeSetupRequired:cloudflareAppReady&&!cloudflareFullReady}: {})};
      };
      const github=state('github'),cloudflare=state('cloudflare');
      return json(origin,{ok:true,walletVerified:true,mode:'preview',enforced:false,
        ready:github.permissionsApproved&&cloudflare.permissionsApproved,
        providers:{github,cloudflare}});
    }
    if (request.method === 'GET' && url.pathname === PREFIX+'/accounts') return json(origin,{ok:true,accounts:await service.list(identity)});
    if (request.method !== 'POST') return json(origin,{ok:false,error:'not_found'},404);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json(origin,{ok:false,error:'json_required'},415);
    if (Number(request.headers.get('Content-Length')) > 8192) return json(origin,{ok:false,error:'too_large'},413);
    const raw = await request.text(); if (raw.length > 8192) return json(origin,{ok:false,error:'too_large'},413);
    let body; try {body = JSON.parse(raw);} catch {return json(origin,{ok:false,error:'invalid_json'},400);}
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json(origin,{ok:false,error:'invalid_json'},400);
    if(url.pathname===PREFIX+'/setup/check'){
      const result=await service.checkSetup(identity);
      if(result?.connectionError)throw Error(result.connectionError);
      return json(origin,{ok:true,...result});
    }
    if (url.pathname === PREFIX+'/handoff/status' || url.pathname === PREFIX+'/handoff/finish') {
      const input={...identity,provider:body.provider,state:body.state};
      const result=url.pathname.endsWith('/finish')
        ? await service.finishHandoff(input) : await service.handoffStatus(input);
      if(result?.connectionError)throw Error(result.connectionError);
      return json(origin,{ok:true,...result});
    }
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
    if(url.pathname===PREFIX+'/start'){
      const started=await service.start({...identity,provider:body.provider,actions:body.actions});
      const state=new URL(started.authorizationUrl).searchParams.get('state');
      const registry=env.CONNECTIONS.get(env.CONNECTIONS.idFromName('oauth-state-registry-v1'));
      await registry.registerOAuthState({state,provider:body.provider,userId:identity.userId,
        expiresAt:Date.now()+Math.min(300,started.expiresIn||300)*1000});
      return json(origin,{ok:true,...started});
    }
    if (url.pathname === PREFIX+'/complete') {const account=await service.complete({...identity,provider:body.provider,state:body.state,code:body.code});if(account?.connectionError)throw Error(account.connectionError);return json(origin,{ok:true,account});}
    if (url.pathname === PREFIX+'/disconnect') return json(origin,await service.disconnect({userId:identity.userId,id:body.id}));
    if (url.pathname === PREFIX+'/refresh') return json(origin,{ok:true,account:await service.refresh({userId:identity.userId,id:body.id})});
    if (url.pathname === PREFIX+'/read') return json(origin,await service.read({userId:identity.userId,id:body.id,operation:body.operation,args:body.args}));
    if (url.pathname === PREFIX+'/select-resource') return json(origin,await service.selectResource({userId:identity.userId,id:body.id,kind:body.kind,resourceId:body.resourceId}));
    return json(origin,{ok:false,error:'not_found'},404);
  } catch (error) {
    const expected = /^(?:starcoin_account_identity_mismatch|starcoin_state_invalid|starcoin_sources_disagree|starcoin_duplicate_receipt|starcoin_cloud_unavailable|starcoin_verified_device_required|github_private_write_not_verified|github_backup_http_\d+|backup_(?:account_mismatch_review_required|mismatch_review_required|malformed_review_required|commit_conflict_retry|commit_unverified|repository_invalid|repository_already_selected|not_configured|invalid_request)|connection_complete_(?:state|exchange|seal|store|unknown)_(?:timeout|type|internal)(?:_(?:token_redirect|login_redirect|external_redirect|other_redirect|receiver|context|redirect|headers|url|timeout|network|function|unknown))?|pairing_invalid_or_expired|verified_wallet_required|wallet_validation_unavailable|connections_not_configured|provider_not_configured|unsupported_action|callback_invalid|callback_session_mismatch|state_invalid_or_used|state_expired|connection_cancelled|connection_invalid|connection_not_found|connection_not_verified|connection_required|credential_unavailable|consent_required|refresh_in_progress|refresh_required|reconnect_required|resource_selection_required|range_invalid|time_invalid|provider_response_too_large|too_many_requests|google_read_http_\d+|cloudflare_client_scopes_unavailable|cloudflare_account_(?:invalid|not_authorized)|cloudflare_accounts_http_\d+)$/;
    const message = expected.test(error.message) || safeConnectionFailure(error.message) ? error.message : 'connection_operation_failed';
    const status = ['verified_wallet_required','starcoin_verified_device_required'].includes(message) ? 401 : message === 'too_many_requests' ? 429 : /unavailable|not_configured|operation_failed/.test(message) ? 503 : 400;
    return json(origin,{ok:false,error:message},status);
  }
}
