// Read-only JSON-KV capture, not a writer fence, D1 snapshot or source attestation.
export const MAX_BRAIN_EXPORT_BYTES=16*1024*1024;
const MAX_RECORDS=100000,MAX_NODES=200000,encoder=new TextEncoder();
const hash=value=>crypto.subtle.digest('SHA-256',encoder.encode(value)).then(bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join(''));
const invalid=message=>{throw Error('brain_state_export_'+message);};

export function validatePrivateBrainExportMetadata(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==4||
  Object.keys(value).some(key=>!['ownerHash','sourceSha','snapshotId','workSha256'].includes(key))||
  ['ownerHash','sourceSha','snapshotId','workSha256'].some(key=>typeof value[key]!=='string')||
  !/^[a-f0-9]{64}$/.test(value.ownerHash||'')||!/^[a-f0-9]{40}$/.test(value.sourceSha||'')||
  !/^[A-Za-z0-9_-]{1,80}$/.test(value.snapshotId||'')||!/^[a-f0-9]{64}$/.test(value.workSha256||''))invalid('metadata_invalid');
 return {ownerHash:value.ownerHash,sourceSha:value.sourceSha,snapshotId:value.snapshotId,workSha256:value.workSha256};
}
function jsonTree(value,budget,seen=new WeakSet(),depth=0){
 if(depth>128||++budget.nodes>MAX_NODES)invalid('value_limit');
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value)||Object.is(value,-0))invalid('unsupported_value');return;}
 if(typeof value!=='object')invalid('unsupported_value');
 if(seen.has(value))invalid('unsupported_value');seen.add(value);
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(array?prototype!==Array.prototype:prototype!==Object.prototype&&prototype!==null)invalid('unsupported_value');
 const keys=Reflect.ownKeys(value);
 if(array&&keys.length!==value.length+1)invalid('unsupported_value');
 for(const key of keys){
  if(array&&key==='length')continue;
  if(typeof key!=='string'||array&&(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=value.length))invalid('unsupported_value');
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))invalid('unsupported_value');
  jsonTree(descriptor.value,budget,seen,depth+1);
 }
}
function compare(a,b){
 const length=Math.min(a.length,b.length);
 for(let i=0;i<length;i++)if(a[i]!==b[i])return a[i]-b[i];
 return a.length-b.length;
}

export async function createPrivateBrainStateExport(storage,metadata){
 const labels=validatePrivateBrainExportMetadata(metadata);
 if(typeof storage?.transaction!=='function')invalid('transaction_required');
 const entries=await storage.transaction(async tx=>{
  // A transaction may be retried. Never retain partial state across attempts.
  const captured=[],budget={nodes:0};let last,lastBytes,bytes=2;
  for(;;){
   // One value per page avoids loading many maximum-sized private values
   // before the byte budget can be checked. Never opt out of input gates.
   const page=await tx.list({...(last===undefined?{}:{startAfter:last}),limit:1,noCache:true});
   if(!(page instanceof Map)||page.size>1)invalid('page_invalid');
   if(page.size===0)return captured;
   const [key,value]=page.entries().next().value;
   if(typeof key!=='string'||!key||key.length>1024)invalid('page_invalid');
   const encoded=encoder.encode(key);
   if(new TextDecoder().decode(encoded)!==key||lastBytes&&compare(encoded,lastBytes)<=0)invalid('page_invalid');
   if(captured.length===MAX_RECORDS)invalid('too_many_records');
   jsonTree(value,budget);
   const pair=JSON.stringify([key,value]);
   bytes+=encoder.encode(pair).byteLength+(captured.length?1:0);
   if(bytes>MAX_BRAIN_EXPORT_BYTES)invalid('too_large');
   // Detach the JSON tree while still inside the storage transaction.
   captured.push(JSON.parse(pair));last=key;lastBytes=encoded;
  }
 });
 const entriesJson=JSON.stringify(entries);
 const document={format:'infinity-brain-private-state/v1',...labels,complete:true,
  entryCount:entries.length,entriesSha256:await hash(entriesJson),entries};
 const serialized=JSON.stringify(document),documentBytes=encoder.encode(serialized).byteLength;
 if(documentBytes>MAX_BRAIN_EXPORT_BYTES)invalid('too_large');
 return {document,serialized,report:{scope:'infinity-main-json-kv',kvSnapshotComplete:true,
  stateRecords:entries.length,documentBytes,sourceAuthorityVerified:false,sourceFenceVerified:false,
  workSnapshotConsistencyVerified:false,productionVerified:false,writerActivationPerformed:false,
  alarmsIncluded:false,sqlTablesIncluded:false,environmentBindingsIncluded:false}};
}
