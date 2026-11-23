/* Bubbles visual-cavity routing model, not an optical simulation or access
 * control. A device decoder really interprets encoded streams using protocols,
 * not a universal black→white→yellow chain. Colors here are engineering labels.
 * Caller supplies only SYNTHETIC metadata, never encrypted payload or secrets.
 */
export const COLOR_CAVITY_STAGES=Object.freeze({
 black:Object.freeze({role:'standby',hex:'#10131c',physicalPixelFilter:false}),
 white:Object.freeze({role:'illumination',hex:'#ffffff',physicalPixelFilter:false}),
 yellow:Object.freeze({role:'incoming',hex:'#ffd451',physicalPixelFilter:false}),
 red:Object.freeze({role:'inspect',hex:'#ec585b',physicalPixelFilter:false}),
 orange:Object.freeze({role:'decision',hex:'#eb9535',physicalPixelFilter:false}),
 blue:Object.freeze({role:'research',hex:'#428ce2',physicalPixelFilter:false}),
 green:Object.freeze({role:'build',hex:'#39a888',physicalPixelFilter:false}),
 purple:Object.freeze({role:'review',hex:'#9c73cc',physicalPixelFilter:false})
});
const CHANNELS=new Set(['red','blue','green','purple']);
const DEFAULT_APERTURES=Object.freeze([true,true,true,true,true,true,true,true]);

export function routeCavityFrame(packets,{requested='blue',lightOn=false,apertures=DEFAULT_APERTURES}={}){
 if(!CHANNELS.has(requested))throw Error('invalid requested channel');
 if(!Array.isArray(packets)||packets.length>128)throw Error('frame limit: at most 128 packets');
 if(!Array.isArray(apertures)||apertures.length<1||apertures.length>32||
  apertures.some(value=>typeof value!=='boolean'))
  throw Error('invalid aperture mask: 1–32 boolean openings');
 let accepted=0,weight=0;
 for(let i=0;i<packets.length;i++){
  const item=packets[i];
  if(!item||typeof item!=='object'||Array.isArray(item)||
   Object.keys(item).sort().join(',')!=='bytes,kind')
   throw Error('metadata only: no payload, account IDs, tokens or arbitrary keys');
  if(!CHANNELS.has(item.kind))throw Error('invalid packet kind');
  if(!Number.isSafeInteger(item.bytes)||item.bytes<0||item.bytes>4096)
   throw Error('invalid byte count');
  if(lightOn===true&&apertures[i%apertures.length]&&item.kind===requested){
   accepted++;weight+=item.bytes;
  }
 }
 const visible=lightOn===true&&accepted>0;
 return {
  format:'bubbles-visual-cavity-frame/v1',
  stage:lightOn===true?'selected':'black',
  guideOrder:lightOn===true?['black','white','yellow','red','orange',requested]:['black'],
  visible,visibleColors:visible?[requested]:[],guideColorsRendered:false,
  accepted,byteWeight:weight,
  aperturesTotal:apertures.length,aperturesOpen:apertures.filter(Boolean).length,
  processed:packets.length,filtered:packets.length-accepted,
  dataAccessGranted:false,authorizesWallet:false,
  note:'Routing colors are symbolic labels. No phone, stream, wallet, network or actual screen pixel data accessed.'
 };
}
export function reduceCavityFrames(frames){
 if(!frames||typeof frames[Symbol.iterator]!=='function')throw Error('frames must be iterable');
 let accepted=0,byteWeight=0,processed=0,count=0;
 for(const frame of frames){
  if(++count>4096)throw Error('batch receipt limit: process additional frames separately');
  if(frame?.format!=='bubbles-visual-cavity-frame/v1'||
   !Number.isSafeInteger(frame.accepted)||frame.accepted<0||
   !Number.isSafeInteger(frame.byteWeight)||frame.byteWeight<0||
   !Number.isSafeInteger(frame.processed)||frame.processed<frame.accepted||
   frame.dataAccessGranted!==false||frame.authorizesWallet!==false)
   throw Error('unverified frame metadata');
  accepted+=frame.accepted;byteWeight+=frame.byteWeight;processed+=frame.processed;
 }
 return {
  format:'bubbles-visual-cavity-summary/v1',frames:count,
  processed,accepted,filtered:processed-accepted,byteWeight,
  dataAccessGranted:false,authorizesWallet:false,
  note:'Bounded counters only; no raw content or persisted device records.'
 };
}
