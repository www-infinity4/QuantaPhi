// Fail-closed final approval of SHA-256 digests for bounded model source windows.
// All full-file hashes are later checked against committed immutable GitHub bytes.
const HASH=/^[a-f0-9]{64}$/;
export async function verifyWindowArbitration(evidence,digest){
 if(!evidence||typeof digest!=='function')throw Error('window_arbitration_evidence_required');
 const edits=evidence.edits,source=evidence.source,hashes=evidence.patchedHashes,patched=evidence.patched||{};
 if(!Array.isArray(edits)||!edits.length||edits.length>12||!source||typeof source!=='object'||!hashes||typeof hashes!=='object')throw Error('window_arbitration_schema_rejected');
 const changed=new Set();
 for(const edit of edits){
  if(!edit||typeof edit.path!=='string'||!edit.path||edit.path.includes('..')||edit.path.startsWith('/')||typeof edit.after!=='string')throw Error('window_patch_invalid');
  changed.add(edit.path);
  const sourceFile=source[edit.path];
  if(!sourceFile||!['existing','new'].includes(sourceFile.kind))throw Error('window_patch_unplanned');
  if(edit.before===null){
   if(sourceFile.kind!=='new'||edit.after.length>15000)throw Error('window_new_file_rejected');
  }else{
   if(sourceFile.kind!=='existing'||typeof edit.before!=='string'||!edit.before||!HASH.test(sourceFile.sha256||'')||!Array.isArray(sourceFile.windows)||!sourceFile.windows.length)throw Error('window_source_missing');
   let visible=false;
   for(const part of sourceFile.windows){
    if(typeof part.text!=='string'||part.text.length>7000||!HASH.test(part.sha256||'')||!Number.isSafeInteger(part.start)||!Number.isSafeInteger(part.end)||part.end-part.start!==part.text.length||part.end>sourceFile.totalChars||part.start<0)throw Error('window_slice_invalid');
    if(await digest(part.text)!==part.sha256)throw Error('window_slice_hash_mismatch');
    if(part.text.includes(edit.before))visible=true;
   }
   if(!visible)throw Error('window_edit_outside_inspected_source');
  }
 }
 const paths=Object.keys(hashes);
 if(paths.length!==changed.size||paths.some(p=>!changed.has(p)||!HASH.test(hashes[p])))throw Error('window_patched_hashes_mismatch');
 if(Object.keys(patched).some(p=>!changed.has(p)))throw Error('window_unplanned_patched_file');
 for(const [path,full]of Object.entries(patched)){
  if(typeof full!=='string'||full.length>10000||await digest(full)!==hashes[path])throw Error('window_small_file_hash_mismatch');
 }
 return {...hashes};
}
