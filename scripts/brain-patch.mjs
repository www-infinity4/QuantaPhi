export const allowedFiles=new Set(['robot-directions.js','robot-directions.css','quanta-agent-iterations.js','quanta-agent-iterations.css']);
export function applyEdits(original,edits){
 if(!Array.isArray(edits)||!edits.length||edits.length>6)throw Error('No bounded patch');
 const result={...original};let bytes=0;
 for(const edit of edits){
  if(!allowedFiles.has(edit.path)||typeof result[edit.path]!=='string'||typeof edit.before!=='string'||!edit.before||typeof edit.after!=='string'||result[edit.path].split(edit.before).length!==2)throw Error('Patch scope or unique match rejected');
  bytes+=edit.before.length+edit.after.length;if(bytes>16000)throw Error('Patch too large');
  result[edit.path]=result[edit.path].replace(edit.before,edit.after);
 }
 return result;
}
export function clearButtonPatch(original){
 if(original['robot-directions.js'].includes("clearButton.dataset.clear='1'"))return [];
 return [{path:'robot-directions.js',before:"let draftTimer;input.addEventListener('input',",after:`// Manual clear also cancels a pending draft write and clears both recovery stores.
const clearButton=node('button','Clear text');clearButton.type='button';clearButton.dataset.clear='1';
clearButton.style.minHeight='44px';send.after(clearButton);
clearButton.addEventListener('click',async()=>{
 clearButton.disabled=true;
 try{
  await ready;clearTimeout(draftTimer);input.value='';await storage(DRAFT,'');
  try{localStorage.removeItem(DRAFT)}catch{}
  status.textContent='Text cleared. Your saved jobs are still available.';input.focus();
 }catch(e){status.textContent='Could not clear the saved draft: '+e.message}
 finally{clearButton.disabled=false}
});
let draftTimer;input.addEventListener('input',`}];
}
