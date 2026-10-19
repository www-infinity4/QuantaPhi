import {githubStarCoinBackup} from './starcoin-backup.mjs';
import {digest, randomToken} from './vault.mjs';
import {PROVIDERS, authorizeConnection} from './authorization.mjs';

async function completionStep(stage,operation){
 try{return await operation();}catch(error){if(error&&typeof error==='object')error.connectionStage=stage;throw error;}
}
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
      const limitKey = prefix+'consent-rate', limit = await tx.get(limitKey);
      const recent = limit && limit.until > this.now() ? limit : {count:0,until:this.now()+60000};
      if (recent.count >= 10) throw Error('too_many_requests');
      const pending = await tx.list({prefix:prefix+'state:',limit:64});
      for (const [pendingKey,value] of pending) if (value.expiresAt <= this.now()) await tx.delete(pendingKey);
      await tx.put(limitKey,{...recent,count:recent.count+1});
      const generation = await tx.get(prefix + 'generation:' + provider) || 0;
      const record = {userId, sessionHash, provider, verifier, actions:[...new Set(actions)], expiresAt:this.now()+300000, generation};
      await tx.put(key, {...await this.vault.seal(record,key),expiresAt:record.expiresAt});
    });
    return {provider, authorizationUrl, expiresIn:300};
  }
  async complete({userId, sessionId, provider, state, code}) {
    const prefix = await this.namespace(userId), sessionHash = await this.session(sessionId);
    if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(state) || typeof code !== 'string' || !code || code.length > 4096) throw Error('callback_invalid');
    const key = prefix + 'state:' + await digest(state);
    const record = await completionStep('state',()=>this.storage.transaction(async tx => {
      const encrypted = await tx.get(key);
      if (!encrypted) throw Error('state_invalid_or_used');
      const pending = await this.vault.open(encrypted, key);
      if (pending.userId !== userId || pending.provider !== provider || pending.sessionHash !== sessionHash) throw Error('callback_session_mismatch');
      if (pending.expiresAt <= this.now()) { await tx.delete(key); return null; }
      await tx.delete(key); // Atomic consume before any provider network call.
      return pending;
    }));
    if (!record) throw Error('state_expired');
    const adapter = Object.hasOwn(this.adapters, provider) && this.adapters[provider];
    if (!adapter) throw Error('provider_not_configured');
    const value = await completionStep('exchange',()=>adapter.exchange({code, verifier:record.verifier, actions:record.actions}));
    if (!value.subject || !value.accessToken || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0 || !Array.isArray(value.grantedActions)) throw Error('provider_response_invalid');
    const id = await digest(provider + ':' + value.subject), connectionKey = prefix + 'connection:' + id;
    const credentialKey = prefix + 'credential:' + id;
    const connection = {id, userId, provider, providerSubject:value.subject, label:String(value.label || value.subject),
      credentialRef:credentialKey, status:'connected', expiresAt:this.now()+value.expiresIn*1000,
      grantedActions:value.grantedActions.filter(a => record.actions.includes(a)), revision:randomToken(), updatedAt:this.now()};
    const ciphertext = await completionStep('seal',()=>this.vault.seal({accessToken:value.accessToken, refreshToken:value.refreshToken || null}, credentialKey));
    await completionStep('store',()=>this.storage.transaction(async tx => {
      if ((await tx.get(prefix + 'generation:' + provider) || 0) !== record.generation) throw Error('connection_cancelled');
      await tx.put(connectionKey, connection); await tx.put(credentialKey, ciphertext);
    }));
    return publicConnection(connection);
  }
  async githubRepositories({userId,id,test=false}) {
    const prefix=await this.namespace(userId);
    if(typeof id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(id))throw Error('connection_invalid');
    const key=prefix+'connection:'+id;
    let record=await this.storage.get(key);
    if(record?.userId!==userId||record.provider!=='github'||record.status!=='connected')throw Error('connection_not_verified');
    if(record.expiresAt<=this.now()+30000){await this.refresh({userId,id});record=await this.storage.get(key);}
    if(!record?.credentialRef||!this.adapters.github?.repositories)throw Error('provider_not_configured');
    const encrypted=await this.storage.get(record.credentialRef);if(!encrypted)throw Error('credential_unavailable');
    const credential=await this.vault.open(encrypted,record.credentialRef);
    const result=test?await this.adapters.github.connectionTest({accessToken:credential.accessToken}):await this.adapters.github.repositories({accessToken:credential.accessToken});
    const current=await this.storage.get(key);
    if(current?.status!=='connected'||current.revision!==record.revision)throw Error('connection_cancelled');
    return result;
  }
  /* The only mutable backup destination per account is the verified first
   * private GitHub repository explicitly chosen by that account. */
  async starCoinBackup({userId,id,repository,snapshot,mode='write'}) {
    const prefix=await this.namespace(userId);
    if(typeof id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(id))throw Error('connection_invalid');
    if(typeof repository!=='string'||!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(repository))
      throw Error('backup_repository_invalid');
    if(!snapshot||!snapshot.data||typeof snapshot.hash!=='string')throw Error('backup_invalid_request');
    const accountKey=prefix+'starcoin:chosen-repository',key=prefix+'connection:'+id;
    let record=await this.storage.get(key);
    if(record?.userId!==userId||record.provider!=='github'||record.status!=='connected')
      throw Error('connection_not_verified');
    if(record.expiresAt<=this.now()+30000){await this.refresh({userId,id});record=await this.storage.get(key);}
    if(!record.credentialRef||!this.adapters.github?.repositories)throw Error('provider_not_configured');
    const selected=await this.storage.get(accountKey);
    if(selected&&selected.repository!==repository)throw Error('backup_repository_already_selected');
    if(mode==='verify'&&!selected)throw Error('backup_not_configured');
    const encrypted=await this.storage.get(record.credentialRef);
    if(!encrypted)throw Error('credential_unavailable');
    const credential=await this.vault.open(encrypted,record.credentialRef);
    const verified=await this.adapters.github.repositories({accessToken:credential.accessToken});
    const eligible=verified.repositories?.find(repo=>repo.name===repository&&repo.private===true&&repo.permissions.write===true);
    if(!eligible)throw Error('github_private_write_not_verified');
    // Repository authority comes from GitHub's installation, not the model,
    // a typed URL, a provider login alone, or the platform owner's token.
    const result=await githubStarCoinBackup({token:credential.accessToken,repository,snapshot,mode});
    const current=await this.storage.get(key);
    if(current?.status!=='connected'||current.revision!==record.revision)
      throw Error('connection_cancelled');
    if(mode==='write'&&!selected){
      await this.storage.transaction(async tx=>{
        const exists=await tx.get(accountKey);
        if(exists&&exists.repository!==repository)throw Error('backup_repository_already_selected');
        if(!exists)await tx.put(accountKey,{repository,connectionId:id,createdAt:this.now()});
      });
    }
    return result;
  }
  async createStarCoinRepository({userId,id}) {
    const prefix=await this.namespace(userId),key=prefix+'connection:'+id;
    if(typeof id!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(id))throw Error('connection_invalid');
    if(await this.storage.get(prefix+'starcoin:chosen-repository'))
      throw Error('backup_repository_already_selected');
    let record=await this.storage.get(key);
    if(record?.userId!==userId||record.provider!=='github'||record.status!=='connected')
      throw Error('connection_not_verified');
    if(record.expiresAt<=this.now()+30000){await this.refresh({userId,id});record=await this.storage.get(key);}
    const encrypted=await this.storage.get(record.credentialRef);
    if(!encrypted)throw Error('credential_unavailable');
    const credential=await this.vault.open(encrypted,record.credentialRef);
    if(!this.adapters.github?.createPrivateBackupRepository)throw Error('provider_not_configured');
    const result=await this.adapters.github.createPrivateBackupRepository({accessToken:credential.accessToken});
    const current=await this.storage.get(key);
    if(current?.status!=='connected'||current.revision!==record.revision)throw Error('connection_cancelled');
    return result;
  }
  async disconnect({userId, id}) {
    const prefix = await this.namespace(userId);
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw Error('connection_invalid');
    const credentials = await this.storage.transaction(async tx => {
      const key = prefix + 'connection:' + id, record = await tx.get(key);
      if (!record || record.userId !== userId) throw Error('connection_not_found');
      const credentials = record.credentialRef ? await tx.get(record.credentialRef) : null;
      await tx.put(prefix + 'generation:' + record.provider, (await tx.get(prefix + 'generation:' + record.provider) || 0)+1);
      if (record.credentialRef) await tx.delete(record.credentialRef);
      await tx.put(key, {...record, status:'disconnected', grantedActions:[], credentialRef:null, revision:randomToken(), updatedAt:this.now()});
      return {credentials, context:record.credentialRef, provider:record.provider};
    });
    let providerRevocation = 'not_attempted';
    if (credentials.credentials && this.adapters[credentials.provider]?.revoke) {
      try {
        await this.adapters[credentials.provider].revoke(await this.vault.open(credentials.credentials, credentials.context));
        providerRevocation = 'confirmed';
      } catch { providerRevocation = 'failed'; }
    }
    return {ok:true, id, status:'disconnected', providerRevocation};
  }
  async list({userId}) {
    const prefix = await this.namespace(userId);
    const rows = await this.storage.list({prefix:prefix+'connection:', limit:100});
    return [...rows.values()].filter(r=>r.userId===userId).map(publicConnection);
  }
  async refresh({userId, id}) {
    const prefix = await this.namespace(userId);
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw Error('connection_invalid');
    const key = prefix+'connection:'+id, lease = randomToken();
    const snapshot = await this.storage.transaction(async tx => {
      const record = await tx.get(key);
      if (!record || record.userId !== userId || record.status !== 'connected') throw Error('connection_not_verified');
      if (record.refreshLease && record.refreshLease.until > this.now()) throw Error('refresh_in_progress');
      const encrypted = await tx.get(record.credentialRef);
      if (!encrypted) throw Error('credential_unavailable');
      await tx.put(key, {...record, refreshLease:{id:lease, until:this.now()+60000}});
      return {record, encrypted};
    });
    const {record} = snapshot, adapter = this.adapters[record.provider];
    let tokens;
    try {
      const old = await this.vault.open(snapshot.encrypted, record.credentialRef);
      if (!old.refreshToken || !adapter?.refresh) throw Error('reconnect_required');
      tokens = await adapter.refresh({refreshToken:old.refreshToken, actions:record.grantedActions});
      if (!tokens.accessToken || !Number.isFinite(tokens.expiresIn) || tokens.expiresIn <= 0 || !Array.isArray(tokens.grantedActions)) throw Error('provider_response_invalid');
      const encrypted = await this.vault.seal({accessToken:tokens.accessToken, refreshToken:tokens.refreshToken || old.refreshToken},record.credentialRef);
      const result = await this.storage.transaction(async tx => {
        const current = await tx.get(key);
        if (current?.status !== 'connected' || current.revision !== record.revision || current.refreshLease?.id !== lease) throw Error('connection_cancelled');
        const updated = {...current, revision:randomToken(), refreshLease:null, expiresAt:this.now()+tokens.expiresIn*1000,
          grantedActions:record.grantedActions.filter(a=>tokens.grantedActions.includes(a)), updatedAt:this.now()};
        await tx.put(record.credentialRef,encrypted); await tx.put(key,updated);
        return publicConnection(updated);
      });
      return result;
    } catch (error) {
      await this.storage.transaction(async tx => {
        const current = await tx.get(key);
        if (current?.revision === record.revision && current.refreshLease?.id === lease) {
          // A refresh may have rotated remotely even if its response was lost.
          // Do not retry an old single-use token after an ambiguous failure.
          await tx.put(key,{...current,status:'reconnect_required',refreshLease:null,updatedAt:this.now()});
        }
      });
      if (tokens && adapter?.revoke) try { await adapter.revoke(tokens); } catch { /* local disconnect remains authoritative */ }
      throw Error(error.message === 'connection_cancelled' ? 'connection_cancelled' : 'reconnect_required');
    }
  }
  async withCredential({userId, id, provider, action}, operation) {
    const prefix = await this.namespace(userId);
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(id)) throw Error('connection_invalid');
    const key = prefix+'connection:'+id;
    let record = await this.storage.get(key);
    // Only refresh after verifying tenant, provider and granted action.
    const check = authorizeConnection({userId,provider,action,connection:record,now:this.now()});
    if (!check.ok && check.reason !== 'refresh_required') throw Error(check.reason);
    if (!record?.grantedActions?.includes(action)) throw Error('consent_required');
    if (record.expiresAt <= this.now()+30000) {
      await this.refresh({userId,id}); record = await this.storage.get(key);
    }
    const authorized = authorizeConnection({userId,provider,action,connection:record,now:this.now()});
    if (!authorized.ok) throw Error(authorized.reason);
    const encrypted = await this.storage.get(record.credentialRef);
    if (!encrypted) throw Error('credential_unavailable');
    const tokens = await this.vault.open(encrypted,record.credentialRef);
    const result = await operation(tokens.accessToken,record);
    const current = await this.storage.get(key);
    if (current?.status !== 'connected' || current.revision !== record.revision) throw Error('connection_cancelled');
    return result;
  }
}
export function publicConnection(record) {
  return {id:record.id, provider:record.provider, label:record.label, status:record.status,
    grantedActions:[...record.grantedActions], expiresAt:record.expiresAt};
}
