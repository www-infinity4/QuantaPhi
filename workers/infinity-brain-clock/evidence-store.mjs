const sha=x=>/^[a-f0-9]{40}$/.test(x||'');
export function evidenceKey({repository,commitSha,runId,name}){
 if(!/^www-infinity4\/[\w.-]+$/.test(repository||'')||!sha(commitSha)||!/^\d{1,24}$/.test(String(runId||''))||! /^[a-zA-Z0-9_-]{1,100}\.(jpg|jpeg|png)$/.test(name||''))throw Error('invalid_evidence_key');
 return `robot-evidence/${repository}/${commitSha}/${runId}/${name}`;
}
export async function archiveImage(bucket,meta,image){
 if(!bucket)throw Error('evidence_storage_not_configured');
 const match=/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image||'');
 if(!match||image.length>3000000)throw Error('invalid_evidence_image');
 const key=evidenceKey(meta),bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
 if(!bytes.length||bytes.length>2*1024*1024)throw Error('evidence_image_too_large');
 if(match[1]==='jpeg'&&!(bytes[0]===255&&bytes[1]===216)||match[1]==='png'&&!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw Error('evidence_signature_mismatch');
 const old=await bucket.head(key);
 if(old){const prior=await bucket.get(key),existing=new Uint8Array(await prior.arrayBuffer());if(existing.length!==bytes.length||existing.some((v,i)=>v!==bytes[i]))throw Error('immutable_evidence_conflict');return {key,size:bytes.length,replayed:true};}
 await bucket.put(key,bytes,{httpMetadata:{contentType:'image/'+match[1],cacheControl:'private, no-store'},customMetadata:{repository:meta.repository,commitSha:meta.commitSha,runId:String(meta.runId),capturedAt:new Date().toISOString()}});
 return {key,size:bytes.length,replayed:false};
}
