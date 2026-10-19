// Only trusted server configuration supplies clients, secrets and callbacks.
// Generated plugins cannot add arbitrary token endpoints to this registry.
const GOOGLE_SCOPES = Object.freeze({
  'drive.read':'https://www.googleapis.com/auth/drive.readonly',
  'drive.write':'https://www.googleapis.com/auth/drive.file',
  'sheets.read':'https://www.googleapis.com/auth/spreadsheets.readonly',
  'sheets.write':'https://www.googleapis.com/auth/spreadsheets',
  'calendar.read':'https://www.googleapis.com/auth/calendar.events.readonly',
  'calendar.write':'https://www.googleapis.com/auth/calendar.events'
});
async function jsonResponse(response, code) {
  if (!response.ok) throw Error(code + '_' + response.status);
  const value = await response.json();
  if (value.error) throw Error(code + '_rejected');
  return value;
}
function tokenFields(value) {
  if (typeof value.access_token !== 'string' || !value.access_token || !/^bearer$/i.test(value.token_type || '')) throw Error('provider_token_invalid');
  if (!Number.isFinite(value.expires_in) || value.expires_in <= 0) throw Error('expiring_token_required');
  return {accessToken:value.access_token, refreshToken:value.refresh_token || null, expiresIn:value.expires_in};
}
function callback(config) {
  const url = new URL(config.redirectUri);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw Error('callback_configuration_invalid');
  if (!config.clientId || !config.clientSecret) throw Error('provider_not_configured');
  return url.href;
}
export function googleAdapter(config, request = (...args)=>globalThis.fetch(...args)) {
  const redirectUri = callback(config);
  return {
    id:'google',
    authorization({state, challenge, actions}) {
      if (!actions.length || actions.some(a => !Object.hasOwn(GOOGLE_SCOPES, a))) throw Error('unsupported_action');
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({client_id:config.clientId, redirect_uri:redirectUri, response_type:'code',
        scope:['openid','email',...new Set(actions.map(a => GOOGLE_SCOPES[a]))].join(' '),
        state, code_challenge:challenge, code_challenge_method:'S256', access_type:'offline',
        prompt:'consent select_account', include_granted_scopes:'true'}).toString();
      return url.href;
    },
    async refresh({refreshToken, actions}) {
      const value = await jsonResponse(await request('https://oauth2.googleapis.com/token', {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
        body:new URLSearchParams({client_id:config.clientId, client_secret:config.clientSecret,
          grant_type:'refresh_token', refresh_token:refreshToken})
      }), 'google_refresh');
      const scopes = typeof value.scope === 'string' ? new Set(value.scope.split(/\s+/)) : null;
      return {...tokenFields(value), grantedActions:actions.filter(a => !scopes || scopes.has(GOOGLE_SCOPES[a]))};
    },
    async revoke({refreshToken, accessToken}) {
      const response = await request('https://oauth2.googleapis.com/revoke', {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
        body:new URLSearchParams({token:refreshToken || accessToken})
      });
      if (!response.ok) throw Error('google_revoke_failed');
    },
    async exchange({code, verifier, actions}) {
      const value = await jsonResponse(await request('https://oauth2.googleapis.com/token', {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(15000),
        body:new URLSearchParams({client_id:config.clientId, client_secret:config.clientSecret, redirect_uri:redirectUri,
          grant_type:'authorization_code', code, code_verifier:verifier})
      }), 'google_exchange');
      const tokens = tokenFields(value);
      const identity = await jsonResponse(await request('https://openidconnect.googleapis.com/v1/userinfo', {
        redirect:'error', signal:AbortSignal.timeout(15000), headers:{Authorization:'Bearer '+tokens.accessToken}
      }), 'google_identity');
      if (typeof identity.sub !== 'string' || !identity.sub) throw Error('provider_identity_invalid');
      const scopes = new Set(String(value.scope || '').split(/\s+/));
      return {...tokens, subject:identity.sub,
        label:identity.email_verified === true ? String(identity.email || identity.sub) : identity.sub,
        grantedActions:actions.filter(a => scopes.has(GOOGLE_SCOPES[a]))};
    }
  };
}

async function githubRequest(url,options){const response=await globalThis.fetch(url,{...options,redirect:'manual'});if(response.status>=300&&response.status<400){let kind='missing';try{const target=new URL(response.headers.get('Location'),url);kind=target.origin!=='https://github.com'?'external':target.pathname==='/login/oauth/access_token'?'token':target.pathname.startsWith('/login')?'login':'other';}catch{}throw TypeError('github_token_redirect_'+kind);}return response;}
export function githubAdapter(config, request = githubRequest) {
  const redirectUri = callback(config);
  return {
    id:'github',
    async connectionTest({accessToken}) {
      const verified=await this.repositories({accessToken});
      const repository='www-infinity4/QuantaPhi';
      if(!verified.repositories.some(r=>r.name===repository&&r.permissions.write))throw Error('repository_write_not_verified');
      const headers={Authorization:'Bearer '+accessToken,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Bubbles-User-Connections','X-GitHub-Api-Version':'2022-11-28'};
      const call=async(path,body)=>jsonResponse(await request('https://api.github.com/repos/'+repository+path,{method:body?'POST':'GET',headers,redirect:'error',signal:AbortSignal.timeout(15000),...(body?{body:JSON.stringify(body)}:{})}),'github_test');
      const repo=await call(''),base=await call('/git/ref/heads/'+encodeURIComponent(repo.default_branch));
      if(!/^[a-f0-9]{40}$/.test(base.object?.sha||''))throw Error('provider_response_invalid');
      const branch='bubbles-connection-test-'+crypto.randomUUID();
      await call('/git/refs',{ref:'refs/heads/'+branch,sha:base.object.sha});
      const content=btoa('# Bubbles GitHub connection test\n\nVerified an authenticated write from the Bubbles account connector.\nGenerated at '+new Date().toISOString()+'\n');
      const response=await request('https://api.github.com/repos/'+repository+'/contents/test-receipt.md',{method:'PUT',headers,redirect:'error',signal:AbortSignal.timeout(15000),body:JSON.stringify({message:'Record Bubbles authenticated connection test',branch,content})});
      const receipt=await jsonResponse(response,'github_test');
      if(!/^[a-f0-9]{40}$/.test(receipt.commit?.sha||''))throw Error('provider_response_invalid');
      return {repository,branch,commit:receipt.commit.sha,url:'https://github.com/'+repository+'/commit/'+receipt.commit.sha,status:'commit_verified'};
    },
    async createPrivateBackupRepository({accessToken}) {
      // This method is invoked only after a real user explicitly requests one
      // repository on their own GitHub account. It may require GitHub App
      // Repository creation permission and repository installation access.
      const headers={Authorization:'Bearer '+accessToken,Accept:'application/vnd.github+json',
        'Content-Type':'application/json','User-Agent':'Bubbles-User-Connections',
        'X-GitHub-Api-Version':'2022-11-28'};
      const response=await request('https://api.github.com/user/repos',{
        method:'POST',headers,redirect:'error',signal:AbortSignal.timeout(15000),
        body:JSON.stringify({name:'infinity-starcoins-backup',private:true,auto_init:true,
          description:'Private StarCoin history mirror, verified against QuantaPhi Cloudflare D1',has_issues:false,has_wiki:false})
      });
      if(response.status===403)throw Error('github_repository_creation_permission_required');
      if(response.status===422)throw Error('github_repository_already_exists');
      if(response.status!==201)throw Error('github_repository_creation_unavailable');
      const created=await response.json();
      if(created.private!==true||!/^[-A-Za-z0-9_.]+\/infinity-starcoins-backup$/.test(created.full_name||''))
        throw Error('github_repository_creation_unverified');
      const verified=await this.repositories({accessToken});
      const installed=verified.repositories.some(repo=>repo.name===created.full_name&&repo.private&&repo.permissions.write);
      return {repository:created.full_name,url:created.html_url,
        status:installed?'ready_to_back_up':'needs_github_app_repository_installation',
        private:true};
    },
    async repositories({accessToken}) {
      const headers={Authorization:'Bearer '+accessToken,Accept:'application/vnd.github+json','User-Agent':'Bubbles-User-Connections','X-GitHub-Api-Version':'2022-11-28'};
      const read=async path=>jsonResponse(await request('https://api.github.com'+path,{headers,redirect:'error',signal:AbortSignal.timeout(15000)}),'github_repositories');
      const catalog=await read('/user/installations?per_page=100');
      if(!Array.isArray(catalog.installations))throw Error('provider_response_invalid');
      const repositories=[];
      for(const installation of catalog.installations.slice(0,20)){
        if(!Number.isSafeInteger(installation.id)||installation.id<=0)continue;
        const data=await read('/user/installations/'+installation.id+'/repositories?per_page=100');
        if(!Array.isArray(data.repositories))throw Error('provider_response_invalid');
        for(const repo of data.repositories){
          if(!Number.isSafeInteger(repo.id)||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(repo.full_name||''))continue;
          repositories.push({id:repo.id,name:repo.full_name,installationId:installation.id,private:repo.private===true,permissions:{read:repo.permissions?.pull===true,write:repo.permissions?.push===true,admin:repo.permissions?.admin===true}});
        }
      }
      return {repositories,truncated:Number(catalog.total_count)>20||Number(catalog.total_count)>catalog.installations.length};
    },
    authorization({state, challenge, actions}) {
      if (actions.some(a => !['repository.read','repository.fork','repository.write'].includes(a))) throw Error('unsupported_action');
      const url = new URL('https://github.com/login/oauth/authorize');
      // GitHub App permissions are configured on the App and installation.
      // Never request broad OAuth-App `repo` scope as a visitor shortcut.
      url.search = new URLSearchParams({client_id:config.clientId, redirect_uri:redirectUri, state,
        code_challenge:challenge, code_challenge_method:'S256'}).toString();
      return url.href;
    },
    async refresh({refreshToken, actions}) {
      const value = await jsonResponse(await request('https://github.com/login/oauth/access_token', {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(15000), headers:{Accept:'application/json','User-Agent':'Bubbles-User-Connections'},
        body:new URLSearchParams({client_id:config.clientId, client_secret:config.clientSecret,
          grant_type:'refresh_token', refresh_token:refreshToken})
      }), 'github_refresh');
      const tokens = tokenFields(value);
      if (!tokens.refreshToken) throw Error('github_rotation_incomplete');
      return {...tokens, grantedActions:[...actions]};
    },
    async revoke({accessToken}) {
      const response = await request('https://api.github.com/applications/'+encodeURIComponent(config.clientId)+'/token', {
        method:'DELETE', redirect:'error', signal:AbortSignal.timeout(15000),
        headers:{Authorization:'Basic '+btoa(config.clientId+':'+config.clientSecret),
          Accept:'application/vnd.github+json', 'Content-Type':'application/json', 'User-Agent':'Bubbles-User-Connections'},
        body:JSON.stringify({access_token:accessToken})
      });
      if (!response.ok && response.status !== 404) throw Error('github_revoke_failed');
    },
    async exchange({code, verifier}) {
      const value = await jsonResponse(await request('https://github.com/login/oauth/access_token', {
        method:'POST', redirect:'error', signal:AbortSignal.timeout(15000), headers:{Accept:'application/json','User-Agent':'Bubbles-User-Connections'},
        body:new URLSearchParams({client_id:config.clientId, client_secret:config.clientSecret, redirect_uri:redirectUri, code, code_verifier:verifier})
      }), 'github_exchange');
      const tokens = tokenFields(value);
      const identity = await jsonResponse(await request('https://api.github.com/user', {
        redirect:'error', signal:AbortSignal.timeout(15000),
        headers:{Authorization:'Bearer '+tokens.accessToken, Accept:'application/vnd.github+json', 'User-Agent':'Bubbles-User-Connections'}
      }), 'github_identity');
      if (!Number.isSafeInteger(identity.id) || identity.id <= 0) throw Error('provider_identity_invalid');
      // Identity is not repository authority. A repository-selection adapter
      // must verify installation membership and effective permissions first.
      return {...tokens, subject:String(identity.id), label:String(identity.login), grantedActions:[]};
    }
  };
}

export const CONNECTOR_REQUIREMENTS = Object.freeze({
  github:'Registered GitHub App, expiring user tokens, installation and repository selection',
  google:'Registered Google OAuth client, configured APIs and required consent verification',
  ebay:'Registered eBay application; approved Offer API access before enabling buyer bids',
  walmart:'Supported consumer buyer authorization and checkout integration must be verified',
  ibm:'Choose IBM product and supported project authentication before enabling actions',
  anthropic:'Supported Claude API credentials or approved integration; consumer login is not assumed API access'
});
