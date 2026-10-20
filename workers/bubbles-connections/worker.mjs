import {DurableObject} from 'cloudflare:workers';
import {ConsentService} from './consent.mjs';
import {TokenVault} from './vault.mjs';
import {googleAdapter,githubAdapter,cloudflareAdapter} from './providers.mjs';
import {executeGoogleRead,selectGoogleResource} from './google-read.mjs';
import {handleConnections} from './router.mjs';
import {ConnectorPairing} from './pairing.mjs';

export class UserConnections extends DurableObject {
  constructor(ctx,env) {
    super(ctx,env);
    this.pairing=new ConnectorPairing(ctx.storage);
    const adapters = {};
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) adapters.google = googleAdapter({clientId:env.GOOGLE_CLIENT_ID,clientSecret:env.GOOGLE_CLIENT_SECRET,redirectUri:'https://quantaphi.org/api/bubbles/connections/google/callback'});
    if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) adapters.github = githubAdapter({clientId:env.GITHUB_CLIENT_ID,clientSecret:env.GITHUB_CLIENT_SECRET,redirectUri:'https://quantaphi.org/api/bubbles/connections/github/callback'});
    if (env.CLOUDFLARE_CLIENT_ID && env.CLOUDFLARE_CLIENT_SECRET) adapters.cloudflare = cloudflareAdapter({clientId:env.CLOUDFLARE_CLIENT_ID,clientSecret:env.CLOUDFLARE_CLIENT_SECRET,redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'});
    this.service = new ConsentService({storage:ctx.storage,vault:new TokenVault(JSON.parse(env.CONNECTION_KEYRING || '{}'),env.CONNECTION_ACTIVE_KEY),adapters});
  }
  async list(input) {return this.service.list(input);}
  async gateStatus(input) {return this.service.gateStatus(input);}
  async githubRepositories(input) {return this.service.githubRepositories(input);}
  async githubConnectionTest(input) {return this.service.githubRepositories({...input,test:true});}
  async starCoinBackup(input) {return this.service.starCoinBackup(input);}
  async createStarCoinRepository(input) {return this.service.createStarCoinRepository(input);}
  async start(input) {return this.service.start(input);}
  async complete(input) {try{return await this.service.complete(input);}catch(error){const stage=['state','exchange','seal','store'].includes(error?.connectionStage)?error.connectionStage:'unknown';const kind=error?.name==='TimeoutError'?'timeout':error?.name==='TypeError'?'type':'internal';const message=String(error?.message||'');const point=/github_token_redirect_token/.test(message)?'token_redirect':/github_token_redirect_login/.test(message)?'login_redirect':/github_token_redirect_external/.test(message)?'external_redirect':/github_token_redirect_other/.test(message)?'other_redirect':/Illegal invocation|receiver/i.test(message)?'receiver':/different request|request context/i.test(message)||message.includes('I/O')?'context':/redirect/i.test(message)?'redirect':/header|ByteString|character/i.test(message)?'headers':/URL|scheme/i.test(message)?'url':/timeout|AbortSignal/i.test(message)?'timeout':/fetch|network|connect/i.test(message)?'network':/not a function/i.test(message)?'function':'unknown';return {connectionError:'connection_complete_'+stage+'_'+kind+'_'+point};}}
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
