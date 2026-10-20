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
    const leaseKey=prefix+'starcoin:backup-lease',lease=randomToken();
    if(mode==='write')await this.storage.transaction(async tx=>{
      const active=await tx.get(leaseKey),bound=await tx.get(accountKey);
      if(bound&&bound.repository!==repository)throw Error('backup_repository_already_selected');
      if(active?.expiresAt>this.now())throw Error('backup_in_progress');
      await tx.put(leaseKey,{lease,repository,expiresAt:this.now()+90000});
    });
    try {
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
    if(mode==='write')await this.storage.put(prefix+'starcoin:last-backup',{
      repository,hash:snapshot.hash,commit:result.commit||null,status:result.status,at:this.now()});
    return result;
    }catch(error){
      if(['backup_mismatch_review_required','backup_account_mismatch_review_required',
          'backup_malformed_review_required'].includes(error?.message))
        await this.storage.put(prefix+'starcoin:review',{
          repository,reason:error.message,at:this.now(),status:'owner_review_required'});
      throw error;
    }finally{
      if(mode==='write')await this.storage.transaction(async tx=>{
        if((await tx.get(leaseKey))?.lease===lease)await tx.delete(leaseKey);
      });
    }
  }
  // Stage 3: one-time, account-owned private GitHub repository, created
  // automatically only after BOTH GitHub and Cloudflare OAuth were approved.
  // Do not confuse the GitHub account with authority to move wallet balances.
  async autoStarCoinBootstrap({userId,snapshot}) {
    const prefix=await this.namespace(userId),now=this.now();
    if(!snapshot?.data||typeof snapshot.hash!=='string')throw Error('backup_invalid_request');
    const accounts=await this.gateStatus({userId});
    const valid=x=>x?.status==='connected'&&Number.isFinite(x.expiresAt)&&x.expiresAt>this.now()+30000;
    const github=accounts.find(x=>x.provider==='github'&&valid(x));
    const cloudflare=accounts.find(x=>x.provider==='cloudflare'&&valid(x)&&
      ['account.read','projects.build','ledger.read'].every(a=>x.grantedActions?.includes(a)));
    if(!github||!cloudflare)throw Error('backup_both_provider_authorizations_required');
    const githubKey=prefix+'connection:'+github.id;
    let record=await this.storage.get(githubKey);
    if(record?.userId!==userId||record.providerSubject!==github.providerSubject||
       record.status!=='connected'||!record.credentialRef||!valid(record))
      throw Error('connection_not_verified');
    const autoKey=prefix+'starcoin:auto-repository';
    const selectedKey=prefix+'starcoin:chosen-repository';
    let provisioned=await this.storage.get(autoKey);
    const selected=await this.storage.get(selectedKey);
    if(provisioned&&provisioned.githubSubject!==github.providerSubject)
      throw Error('backup_account_mismatch_review_required');
    if(provisioned&&selected&&provisioned.repository!==selected.repository)
      throw Error('backup_repository_already_selected');
    if(!provisioned&&selected){
      provisioned={repository:selected.repository,githubSubject:github.providerSubject,
        connectionId:github.id,createdAt:selected.createdAt||now,source:'existing_verified'};
      // Existing repository still requires verification of installation write
      // before any backup; do not invent a GitHub repo or adopt random names.
      await this.storage.put(autoKey,provisioned);
    }
    if(!provisioned){
      if(!this.adapters.github?.createOwnedPrivateLedgerRepository)
        throw Error('provider_not_configured');
      const leaseKey=prefix+'starcoin:auto-create-lease',lease=randomToken();
      await this.storage.transaction(async tx=>{
        const existing=await tx.get(autoKey),currentLease=await tx.get(leaseKey);
        if(existing)throw Error('backup_in_progress');
        if(currentLease?.expiresAt>this.now())throw Error('backup_in_progress');
        await tx.put(leaseKey,{lease,expiresAt:this.now()+120000});
      });
      try{
        // Derive a pseudonymous, stable name from verified internal account ID.
        const repositoryName='infinity-wallet-backup-'+
          (await digest('infinity-github-backup-v1:'+userId)).slice(0,16);
        const ciphertext=await this.storage.get(record.credentialRef);
        if(!ciphertext)throw Error('credential_unavailable');
        const credential=await this.vault.open(ciphertext,record.credentialRef);
        const created=await this.adapters.github.createOwnedPrivateLedgerRepository({
          accessToken:credential.accessToken,expectedSubject:record.providerSubject,repositoryName});
        const still=await this.storage.get(githubKey);
        if(still?.status!=='connected'||still.revision!==record.revision)
          throw Error('connection_cancelled');
        provisioned={repository:created.repository,repositoryId:created.repositoryId,
          githubSubject:record.providerSubject,connectionId:github.id,createdAt:this.now(),
          source:'created_private'};
        await this.storage.put(autoKey,provisioned);
      }finally{
        await this.storage.transaction(async tx=>{
          if((await tx.get(leaseKey))?.lease===lease)await tx.delete(leaseKey);
        });
      }
    }
    const verification=await this.githubRepositories({userId,id:github.id});
    const installed=verification.repositories?.find(x=>x.name===provisioned.repository&&
      x.private===true&&x.permissions?.write===true);
    if(!installed)return {status:'needs_github_app_repository_installation',
      repository:provisioned.repository,private:true,coverage:'starcoins_pilot'};
    const result=await this.starCoinBackup({
      userId,id:github.id,repository:provisioned.repository,snapshot,mode:'write'});
    const last=await this.storage.get(prefix+'starcoin:last-backup');
    const commit=result.commit||((last?.hash===snapshot.hash)?last.commit:null);
    return {status:result.status,repository:provisioned.repository,private:true,
      hash:snapshot.hash,commit:commit||null,
      coverage:'starcoins_pilot',receiptCount:snapshot.data.receipts.length};
  }
  async autoStarCoinStatus({userId}) {
    const prefix=await this.namespace(userId);
    const [repository,last,review]=await Promise.all([
      this.storage.get(prefix+'starcoin:auto-repository'),
      this.storage.get(prefix+'starcoin:last-backup'),
      this.storage.get(prefix+'starcoin:review')]);
    if(!repository)return {status:'not_created',coverage:'starcoins_pilot'};
    if(review?.repository===repository.repository)
      return {status:'owner_review_required',repository:repository.repository,
        coverage:'starcoins_pilot'};
    if(last?.repository!==repository.repository)
      return {status:'repository_created',repository:repository.repository,coverage:'starcoins_pilot'};
    return {status:last.status,repository:repository.repository,
      commit:last.commit||null,hash:last.hash,at:last.at,coverage:'starcoins_pilot'};
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
  // Persistent connection check after reload: stored records are scoped to
  // the verified wallet, and expired credentials are refreshed once server-side.
  // Never return OAuth credentials or trust status cached in a browser.
  async gateStatus({userId}) {
    const accounts=await this.list({userId});
    for(const record of accounts){
      if(!['github','cloudflare'].includes(record.provider)||
          record.status!=='connected'||record.expiresAt>this.now()+30000)continue;
      try { await this.refresh({userId,id:record.id}); }
      catch { /* A failed refresh remains visibly unverified. */ }
    }
    return this.list({userId});
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
