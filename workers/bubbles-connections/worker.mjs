import {DurableObject} from 'cloudflare:workers';
import {ConsentService} from './consent.mjs';
import {OwnerPasskeys} from './owner-passkeys.mjs';
import {TokenVault,digest} from './vault.mjs';
import {googleAdapter,githubAdapter,cloudflareAdapter,resolveCloudflareScopeConfig} from './providers.mjs';
import {executeGoogleRead,selectGoogleResource} from './google-read.mjs';
import {handleConnections} from './router.mjs';
import {ConnectorPairing} from './pairing.mjs';
import {connectionResult} from './completion.mjs';
import {checkConnectionSetup} from './setup-check.mjs';
import {walletEmailPreference} from './wallet-email.mjs';

export class UserConnections extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.pairing=new ConnectorPairing(ctx.storage);
    this.ownerPasskeys=new OwnerPasskeys(ctx.storage);
    const adapters = {};
    const cloudflareScopes=resolveCloudflareScopeConfig(env);
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) adapters.google = googleAdapter({clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,redirectUri:'https://quantaphi.org/api/bubbles/connections/google/callback'});
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) adapters.github = githubAdapter({clientId:env.GITHUB_CLIENT_ID,clientSecret:env.GITHUB_CLIENT_SECRET,redirectUri:'https://quantaphi.org/api/bubbles/connections/github/callback'});
    if (env.CLOUDFLARE_CLIENT_ID && env.CLOUDFLARE_CLIENT_SECRET && cloudflareScopes)
      adapters.cloudflare = cloudflareAdapter({clientId:env.CLOUDFLARE_CLIENT_ID,clientSecret:env.CLOUDFLARE_CLIENT_SECRET,
        allowedScopes:cloudflareScopes,
        redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'});
    this.service = new ConsentService({storage:ctx.storage,vault:new TokenVault(JSON.parse(env.CONNECTION_KEYRING || '{}'),env.CONNECTION_ACTIVE_KEY),adapters});
  }
  async passkeyRegisterBegin(input){return this.ownerPasskeys.beginRegistration(input);}
  async passkeyRegisterFinish(input){return this.ownerPasskeys.finishRegistration(input);}
  async passkeyLoginBegin(input){return this.ownerPasskeys.beginAuthentication(input);}
  async passkeyLoginFinish(input){return this.ownerPasskeys.finishAuthentication(input);}
  async passkeyValidateSession(input){return this.ownerPasskeys.validateSession(input);}
  async list(input) {return this.service.list(input);}
  async walletEmail(input) {return walletEmailPreference(this.service,input);}
  async gateStatus(input) {return this.service.gateStatus(input);}
  async githubRepositories(input) {return this.service.githubRepositories(input);}
  async cloudflareAccounts(input) {return this.service.cloudflareAccounts(input);}
  async selectCloudflareAccount(input) {return this.service.selectCloudflareAccount(input);}
  async githubConnectionTest(input) {return this.service.githubRepositories({...input,test:true});}
  async starCoinBackup(input) {return this.service.starCoinBackup(input);}
  async createStarCoinRepository(input) {return this.service.createStarCoinRepository(input);}
  async registerOAuthState({state,provider,userId,expiresAt}) {
    if(typeof state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(state)||
       !['github','cloudflare','google'].includes(provider)||
       typeof userId!=='string'||!userId||!Number.isFinite(expiresAt)||
       expiresAt<=Date.now()||expiresAt>Date.now()+300000)throw Error('callback_invalid');
    const key='oauth-locator:'+await digest(state);
    await this.service.storage.transaction(async tx=>{
      if(await tx.get(key))throw Error('state_invalid_or_used');
      await tx.put(key,{provider,userId,expiresAt});
    });
    return {registered:true};
  }
  async lookupOAuthState({state,provider}) {
    if(typeof state!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(state)||
       !['github','cloudflare','google'].includes(provider))throw Error('callback_invalid');
    const key='oauth-locator:'+await digest(state);
    const record=await this.service.storage.get(key);
    if(!record||record.provider!==provider||record.expiresAt<=Date.now())throw Error('state_invalid_or_used');
    return {userId:record.userId};
  }
  async start(input) {return this.service.start(input);}
  async handoff(input) {
    try {return await this.service.handoff(input);}
    catch(error) {
      // Durable Object RPC must return only non-secret failure categories.
      // Never send a provider code, state, user ID, encryption record or
      // underlying exception text to the browser/callback URL.
      const message=String(error?.message||'');
      const stage=error?.connectionStage;
      const failure=message==='state_invalid_or_used'?'state_invalid':
        message==='callback_already_received'?'conflicting_callback':
        stage==='handoff_decrypt'?'decrypt':
        stage==='handoff_encrypt'?'encrypt':
        stage==='handoff_store'?'storage':
        'unavailable';
      return {received:false,failure};
    }
  }
  async handoffStatus(input) {return connectionResult(()=>this.service.handoffStatus(input));}
  async finishHandoff(input) {return connectionResult(()=>this.service.finishHandoff(input));}
  async complete(input) {return connectionResult(()=>this.service.complete(input));}
  async checkSetup(input) {return connectionResult(()=>checkConnectionSetup(this.service,input));}
  async disconnect(input) {return this.service.disconnect(input);}
  async refresh(input) {return this.service.refresh(input);}
  async read(input) {return executeGoogleRead(this.service,input);}
  async selectResource(input) {return selectGoogleResource(this.service,input);}
  async createPair(input){return this.pairing.create(input);}
  async redeemPair(input){return this.pairing.redeem(input);}
  async pairIdentity(input){return this.pairing.identity(input);}
  async endPair(input){return this.pairing.end(input);}
  async alarm(){return this.pairing.cleanup();}
}
export default {async fetch(request,env) {
  return handleConnections(request,env,userId=>env.CONNECTIONS.get(env.CONNECTIONS.idFromName(userId)));
}};
