import {randomToken} from './vault.mjs';

// A wallet-authenticated setup probe. It never uses a real authorization code,
// asks for provider consent, reads an account, or creates a connection.
export async function checkConnectionSetup(service,{userId}) {
  const prefix=await service.namespace(userId),now=service.now();
  await service.storage.transaction(async tx=>{
    const key=prefix+'setup-check-rate';
    if((await tx.get(key))>now)throw Error('too_many_requests');
    await tx.put(key,now+30000);
  });
  const key=prefix+'setup-check:'+randomToken(),sample=randomToken();
  let vault='failed',storage='unchecked';
  try {
    const sealed=await service.vault.seal({sample},key);
    await service.storage.transaction(async tx=>{await tx.put(key,sealed);});
    const saved=await service.storage.get(key);
    if((await service.vault.open(saved,key)).sample!==sample)throw Error('vault_roundtrip_failed');
    vault='passed';storage='passed';
  } finally {
    await service.storage.transaction(async tx=>{await tx.delete(key);});
  }
  const adapter=service.adapters.cloudflare;
  if(!adapter?.checkClient)return {vault,storage,client:{status:'not_configured'},accountVerified:false};
  const client=await adapter.checkClient();
  return {vault,storage,client,accountVerified:false};
}
