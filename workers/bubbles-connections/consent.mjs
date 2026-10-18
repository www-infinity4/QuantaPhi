import {digest, randomToken} from './vault.mjs';
import {PROVIDERS} from './authorization.mjs';

// Storage must implement Durable Object transactional get/put/delete. This
// service is called only after a host authenticates its user and session.
// No public fetch router is exported until that host integration is verified.
export class ConsentService {
  constructor({storage, vault, adapters, now = Date.now}) {
    this.storage = storage; this.vault = vault; this.adapters = adapters; this.now = now;
  }
  async namespace(userId) {
    if (typeof userId !== 'string' || !userId || userId.length > 256) throw Error('authentication_required');
    return 'user:' + await digest(userId) + ':';
  }
  async session(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 512) throw Error('session_required');
    return digest(sessionId);
  }
  async start({userId, sessionId, provider, actions}) {
    const prefix = await this.namespace(userId), sessionHash = await this.session(sessionId);
    if (!Object.hasOwn(this.adapters, provider) || !Object.hasOwn(PROVIDERS, provider)) throw Error('provider_not_configured');
    if (!Array.isArray(actions) || actions.length > 20 || actions.some(a => !PROVIDERS[provider].actions.includes(a))) throw Error('unsupported_action');
    const adapter = this.adapters[provider], state = randomToken(), verifier = randomToken();
    const authorizationUrl = adapter.authorization({state, challenge:await digest(verifier), actions});
    const key = prefix + 'state:' + await digest(state);
    await this.storage.transaction(async tx => {
      const generation = await tx.get(prefix + 'generation:' + provider) || 0;
      const record = {userId, sessionHash, provider, verifier, actions:[...new Set(actions)], expiresAt:this.now()+300000, generation};
      await tx.put(key, await this.vault.seal(record, key));
    });
    return {provider, authorizationUrl, expiresIn:300};
  }
  async complete({userId, sessionId, provider, state, code}) {
    const prefix = await this.namespace(userId), sessionHash = await this.session(sessionId);
    if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state) || typeof code !== 'string' || !code || code.length > 4096) throw Error('callback_invalid');
    const key = prefix + 'state:' + await digest(state);
    const record = await this.storage.transaction(async tx => {
      const encrypted = await tx.get(key);
      if (!encrypted) throw Error('state_invalid_or_used');
      const pending = await this.vault.open(encrypted, key);
      if (pending.userId !== userId || pending.provider !== provider || pending.sessionHash !== sessionHash) throw Error('callback_session_mismatch');
      if (pending.expiresAt <= this.now()) { await tx.delete(key); return null; }
      await tx.delete(key); // Atomic consume before any provider network call.
      return pending;
    });
    if (!record) throw Error('state_expired');
    const adapter = Object.hasOwn(this.adapters, provider) && this.adapters[provider];
    if (!adapter) throw Error('provider_not_configured');
    const value = await adapter.exchange({code, verifier:record.verifier, actions:record.actions});
    if (!value.subject || !value.accessToken || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0 || !Array.isArray(value.grantedActions)) throw Error('provider_response_invalid');
    const id = await digest(provider + ':' + value.subject), connectionKey = prefix + 'connection:' + id;
    const credentialKey = prefix + 'credential:' + id;
    const connection = {id, userId, provider, providerSubject:value.subject, label:String(value.label || value.subject),
      credentialRef:credentialKey, status:'connected', expiresAt:this.now()+value.expiresIn*1000,
      grantedActions:value.grantedActions.filter(a => record.actions.includes(a)), updatedAt:this.now()};
    const ciphertext = await this.vault.seal({accessToken:value.accessToken, refreshToken:value.refreshToken || null}, credentialKey);
    await this.storage.transaction(async tx => {
      if ((await tx.get(prefix + 'generation:' + provider) || 0) !== record.generation) throw Error('connection_cancelled');
      await tx.put(connectionKey, connection); await tx.put(credentialKey, ciphertext);
    });
    return publicConnection(connection);
  }
  async disconnect({userId, id}) {
    const prefix = await this.namespace(userId);
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw Error('connection_invalid');
    return this.storage.transaction(async tx => {
      const key = prefix + 'connection:' + id, record = await tx.get(key);
      if (!record || record.userId !== userId) throw Error('connection_not_found');
      await tx.put(prefix + 'generation:' + record.provider, (await tx.get(prefix + 'generation:' + record.provider) || 0)+1);
      await tx.delete(record.credentialRef);
      await tx.put(key, {...record, status:'disconnected', grantedActions:[], credentialRef:null, updatedAt:this.now()});
      return {ok:true, id, status:'disconnected', providerRevocation:'not_attempted'};
    });
  }
}
export function publicConnection(record) {
  return {id:record.id, provider:record.provider, label:record.label, status:record.status,
    grantedActions:[...record.grantedActions], expiresAt:record.expiresAt};
}
