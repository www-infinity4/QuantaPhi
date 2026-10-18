import {DurableObject} from 'cloudflare:workers';
import {ConsentService} from './consent.mjs';
import {TokenVault} from './vault.mjs';
import {googleAdapter,githubAdapter} from './providers.mjs';
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
    this.service = new ConsentService({storage:ctx.storage,vault:new TokenVault(JSON.parse(env.CONNECTION_KEYRING || '{}'),env.CONNECTION_ACTIVE_KEY),adapters});
  }
  async list(input) {return this.service.list(input);}
  async start(input) {return this.service.start(input);}
  async complete(input) {try{return await this.service.complete(input);}catch(error){const allowed=/^(expiring_token_required|provider_token_invalid|provider_response_invalid|provider_identity_invalid|github_exchange_(?:incorrect_client_credentials|bad_verification_code|redirect_uri_mismatch|application_suspended|expired_token|unsupported_grant_type)|github_exchange_rejected|github_exchange_\d+|github_identity_rejected|github_identity_\d+|callback_invalid|callback_session_mismatch|state_invalid_or_used|state_expired|connection_cancelled)$/;return {connectionError:allowed.test(error.message)?error.message:'connection_operation_failed'};}}
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
