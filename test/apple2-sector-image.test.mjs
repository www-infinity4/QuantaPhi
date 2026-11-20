import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ENCODE_6_AND_2,encodeSector62,decodeSector62,sectorImageToNib,nibToSectorImage,sectorOrderMap,SECTOR_IMAGE_BYTES} from '../apple2-infinity/sector-image.mjs';
import {Apple2Infinity,NIB_TRACK_BYTES} from '../apple2-infinity/core.mjs';
const sample=()=>Uint8Array.from({length:SECTOR_IMAGE_BYTES},(_,i)=>((i>>8)*37+i*71+(i>>3))&255);
test('GCR table has 64 unique legal values',()=>{
 assert.equal(ENCODE_6_AND_2.length,64);assert.equal(new Set(ENCODE_6_AND_2).size,64);
 assert.equal(ENCODE_6_AND_2[0],0x96);assert.equal(ENCODE_6_AND_2[63],0xff);
 for(const n of ENCODE_6_AND_2)assert.ok(n&0x80);
});
test('6-and-2 correctly encodes and decodes varied sectors',()=>{
 for(let seed=0;seed<10;seed++){
  const src=Uint8Array.from({length:256},(_,i)=>(i*139+(i>>1)*7+seed*33)&255);
  const gcr=encodeSector62(src);
  assert.equal(gcr.length,343);assert.ok([...gcr].every(x=>ENCODE_6_AND_2.includes(x)));
  assert.deepEqual(decodeSector62(gcr),src);
 }
 assert.ok([...encodeSector62(new Uint8Array(256))].every(x=>x===0x96));
 assert.throws(()=>encodeSector62(new Uint8Array(255)),RangeError);
});
test('6-and-2 rejects illegal nibble and corrupted checksum',()=>{
 const gcr=encodeSector62(Uint8Array.from({length:256},(_,i)=>i));
 const bad=gcr.slice();bad[4]=0;
 assert.throws(()=>decodeSector62(bad),/GCR/);
 const changed=gcr.slice();changed[100]=ENCODE_6_AND_2[(ENCODE_6_AND_2.indexOf(changed[100])+1)%64];
 assert.throws(()=>decodeSector62(changed),/checksum/);
 assert.throws(()=>decodeSector62(gcr.slice(0,342)),RangeError);
});
test('DOS and ProDOS sector-order maps',()=>{
 assert.deepEqual(sectorOrderMap('dos'),[0,13,11,9,7,5,3,1,14,12,10,8,6,4,2,15]);
 assert.deepEqual(sectorOrderMap('prodos'),[0,2,4,6,8,10,12,14,1,3,5,7,9,11,13,15]);
 assert.throws(()=>sectorOrderMap('unknown'),/order/);
});
test('NIB conversion creates fixed-size 35-track stream and address markers',()=>{
 const raw=sample(),nib=sectorImageToNib(raw,{volume:254});
 assert.equal(nib.length,35*NIB_TRACK_BYTES);
 assert.deepEqual([...nib.subarray(128,131)],[0xd5,0xaa,0x96]);
 const before=nib.slice();raw[0]^=255;assert.deepEqual(nib,before);
});
test('all 560 sectors round trip through DOS-order GCR',()=>{
 const raw=sample();assert.deepEqual(nibToSectorImage(sectorImageToNib(raw,{order:'dos'}),{order:'dos'}),raw);
});
test('all 560 sectors round trip through ProDOS-order GCR',()=>{
 const raw=sample();assert.deepEqual(nibToSectorImage(sectorImageToNib(raw,{order:'prodos'}),{order:'prodos'}),raw);
});
test('invalid image sizes, bad volume, damaged sector address are rejected',()=>{
 assert.throws(()=>sectorImageToNib(new Uint8Array(16)),RangeError);
 assert.throws(()=>sectorImageToNib(sample(),{volume:-1}),RangeError);
 assert.throws(()=>sectorImageToNib(sample(),{order:'auto'}),/order/);
 const nib=sectorImageToNib(sample());nib[135]^=1;
 assert.throws(()=>nibToSectorImage(nib),/address|checksum|sector/i);
});
test('slot-6 controller reads converted image's address prologue',()=>{
 const vm=new Apple2Infinity();vm.bus.disk.mount(0,sectorImageToNib(sample()));
 vm.bus.write(0xc0e9,0);
 for(let i=0;i<128;i++)assert.equal(vm.bus.read(0xc0ec),0xff);
 assert.deepEqual([vm.bus.read(0xc0ec),vm.bus.read(0xc0ec),vm.bus.read(0xc0ec)],[0xd5,0xaa,0x96]);
});
test('browser permits local DOS and ProDOS disk files without network',()=>{
 const html=readFileSync(new URL('../apple2-infinity/index.html',import.meta.url),'utf8');
 assert.match(html,/\.dsk,\.do,\.po/);
 assert.match(html,/sectorImageToNib\(/);
 assert.match(html,/extension==='po'\?'prodos':'dos'/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest/);
});
