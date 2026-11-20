/* Avatar AI ESP32 source adapter: allowlisted, local, non-sensitive observations.
 * Does not read neural activity, infer thoughts or create agent instructions.
 */
export const ESP32_SERVICE_UUID='b3d70001-62ce-49b9-a52b-0e1923000001';
export const ESP32_NOTIFY_UUID='b3d70002-62ce-49b9-a52b-0e1923000001';
const decoder=new TextDecoder('utf-8',{fatal:true});
const readings={light:[0,100],temperature_c:[-20,85]};
export function parseEsp32Observation(data){
 try{
  let bytes;
  if(data instanceof DataView)bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
  else if(data instanceof Uint8Array)bytes=data;
  else return null;
  if(bytes.byteLength<8||bytes.byteLength>180)return null;
  const raw=JSON.parse(decoder.decode(bytes));
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.v!==1||!Number.isSafeInteger(raw.seq)||raw.seq<0||raw.seq>2147483647)return null;
  let label='';
  if(raw.kind==='button'&&raw.id==='button'&&(raw.value===0||raw.value===1))label=raw.value===1?'Button pressed':'Button released';
  else if(raw.kind==='sensor'&&Object.hasOwn(readings,raw.id)&&typeof raw.value==='number'&&Number.isFinite(raw.value)){
   const [low,high]=readings[raw.id];
   if(raw.value<low||raw.value>high)return null;
   label=(raw.id==='light'?'Light reading: ':'Temperature (°C): ')+raw.value;
  }else return null;
  return {branch:'ESP32',kind:raw.kind,label,seq:raw.seq,value:raw.value};
 }catch{return null;}
}
export function mergeEsp32Observation(previous,observation){
 const items=Array.isArray(previous)?previous.filter(x=>x&&x.branch==='ESP32'&&Number.isSafeInteger(x.seq)).slice(-8):[];
 if(!observation||observation.branch!=='ESP32'||!Number.isSafeInteger(observation.seq))return items;
 if(items.some(x=>x.seq===observation.seq))return items;
 return [...items,observation].slice(-8);
}
export function esp32PromptExcerpt(observation){
 if(!observation||observation.branch!=='ESP32'||!['button','sensor'].includes(observation.kind))return '';
 return 'ESP32 observation: '+String(observation.label).slice(0,80)+'. Local unverified reading; not a thought or command.';
}
