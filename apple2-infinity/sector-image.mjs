/* Apple II 16-sector disk-image conversion. Original, offline, no ROM/assets bundled.
 * Converts user-supplied DOS/ProDOS 140K images to byte-level Disk II NIB streams.
 */
export const SECTOR_IMAGE_BYTES=35*16*256;
export const ENCODE_6_AND_2=Object.freeze([
0x96,0x97,0x9a,0x9b,0x9d,0x9e,0x9f,0xa6,0xa7,0xab,0xac,0xad,0xae,0xaf,0xb2,0xb3,
0xb4,0xb5,0xb6,0xb7,0xb9,0xba,0xbb,0xbc,0xbd,0xbe,0xbf,0xcb,0xcd,0xce,0xcf,0xd3,
0xd6,0xd7,0xd9,0xda,0xdb,0xdc,0xdd,0xde,0xdf,0xe5,0xe6,0xe7,0xe9,0xea,0xeb,0xec,
0xed,0xee,0xef,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf9,0xfa,0xfb,0xfc,0xfd,0xfe,0xff
]);
const DECODE=new Map(ENCODE_6_AND_2.map((v,i)=>[v,i]));
const DOS=Object.freeze([0,13,11,9,7,5,3,1,14,12,10,8,6,4,2,15]);
const PO=Object.freeze([0,2,4,6,8,10,12,14,1,3,5,7,9,11,13,15]);
const flip=n=>((n&1)<<1)|((n&2)>>1);
export function sectorOrderMap(order='dos'){
 if(order==='dos')return [...DOS];
 if(order==='prodos')return [...PO];
 throw Error('Unsupported sector order: use dos or prodos');
}
export function encodeSector62(src){
 if(!(src instanceof Uint8Array)||src.length!==256)throw RangeError('Sector must be 256 bytes');
 const data=new Uint8Array(342);
 for(let i=0;i<86;i++)data[i]=flip(src[i]&3)|(flip(src[i+86]&3)<<2)|(i<84?flip(src[i+172]&3)<<4:0);
 for(let i=0;i<256;i++)data[i+86]=src[i]>>2;
 const out=new Uint8Array(343);let prev=0;
 for(let i=0;i<342;i++){out[i]=ENCODE_6_AND_2[data[i]^prev];prev=data[i];}
 out[342]=ENCODE_6_AND_2[prev];return out;
}
export function decodeSector62(encoded){
 if(!(encoded instanceof Uint8Array)||encoded.length!==343)throw RangeError('GCR payload must be 343 bytes');
 const d=new Uint8Array(342);let prev=0;
 for(let i=0;i<342;i++){
  const v=DECODE.get(encoded[i]);if(v===undefined)throw Error('Invalid GCR nibble');
  d[i]=v^prev;prev=d[i];
 }
 if(DECODE.get(encoded[342])!==prev)throw Error('Invalid GCR checksum');
 const out=new Uint8Array(256);
 for(let i=0;i<256;i++)out[i]=d[i+86]<<2;
 for(let i=0;i<86;i++){
  out[i]|=flip(d[i]&3);out[i+86]|=flip((d[i]>>2)&3);
  if(i<84)out[i+172]|=flip((d[i]>>4)&3);
 }
 return out;
}
const encode44=n=>[0xaa|((n>>1)&0x55),0xaa|(n&0x55)];
const decode44=(a,b)=>((a<<1)&0xaa)|(b&0x55);
export function sectorImageToNib(image,{order='dos',volume=254}={}){
 if(!(image instanceof Uint8Array)||image.length!==SECTOR_IMAGE_BYTES)throw RangeError('Disk must be a 143360-byte 16-sector image');
 if(!Number.isInteger(volume)||volume<0||volume>255)throw RangeError('Volume must be 0..255');
 const map=sectorOrderMap(order),reverse=new Array(16);
 for(let logical=0;logical<16;logical++)reverse[map[logical]]=logical;
 const out=new Uint8Array(35*6656).fill(0xff);
 for(let t=0;t<35;t++){
  const start=t*6656;let pos=start;
  const add=(...values)=>{if(pos+values.length>start+6656)throw Error('Track capacity exceeded');for(const value of values)out[pos++]=value;};
  const gap=n=>{for(let i=0;i<n;i++)add(0xff);};
  for(let p=0;p<16;p++){
   gap(p===0?128:(t===0?40:38));
   add(0xd5,0xaa,0x96,...encode44(volume),...encode44(t),...encode44(p),...encode44(volume^t^p),0xde,0xaa,0xeb);
   gap(5);add(0xd5,0xaa,0xad);
   const startSector=(t*16+reverse[p])*256;
   for(const value of encodeSector62(image.subarray(startSector,startSector+256)))add(value);
   add(0xde,0xaa,0xeb,0xff);
  }
 }
 return out;
}
export function nibToSectorImage(image,{order='dos'}={}){
 const orderMap=sectorOrderMap(order);
 if(!(image instanceof Uint8Array)||image.length!==35*6656)throw RangeError('NIB must be 35 tracks of 6656 bytes');
 const out=new Uint8Array(SECTOR_IMAGE_BYTES);
 for(let t=0;t<35;t++){
  const track=image.subarray(t*6656,(t+1)*6656),seen=new Set();
  for(let i=0;i<track.length-15;i++){
   if(track[i]!==0xd5||track[i+1]!==0xaa||track[i+2]!==0x96)continue;
   const volume=decode44(track[i+3],track[i+4]),tr=decode44(track[i+5],track[i+6]),p=decode44(track[i+7],track[i+8]),check=decode44(track[i+9],track[i+10]);
   if((volume^tr^p)!==check||tr!==t||p>15)throw Error('Invalid sector address checksum or track/sector');
   if(seen.has(p))throw Error('Duplicate physical sector');
   if(track[i+11]!==0xde||track[i+12]!==0xaa)throw Error('Invalid address epilogue');
   let begin=-1;
   for(let j=i+13;j<Math.min(i+64,track.length-346);j++)
    if(track[j]===0xd5&&track[j+1]===0xaa&&track[j+2]===0xad){begin=j+3;break;}
   if(begin<0)throw Error('Missing sector data prologue');
   const raw=decodeSector62(track.subarray(begin,begin+343));
   out.set(raw,(t*16+orderMap.indexOf(p))*256);
   seen.add(p);i=begin+345;
  }
  if(seen.size!==16)throw Error('Incomplete sector track '+t);
 }
 return out;
}
