import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Apple2Infinity,DISK2_BASE,NIB_TRACK_BYTES,NIB_TRACKS} from '../apple2-infinity/core.mjs';

function nib(fill=0xff){return new Uint8Array(NIB_TRACK_BYTES*NIB_TRACKS).fill(fill);}

test('slot-6 nibble image requires exact format and makes a private copy',()=>{
 const m=new Apple2Infinity(),data=nib(0x91);
 assert.equal(DISK2_BASE,0xc0e0);
 assert.equal(NIB_TRACK_BYTES,6656);assert.equal(NIB_TRACKS,35);
 assert.throws(()=>m.bus.disk.mount(0,new Uint8Array(143360)),/NIB/);
 assert.throws(()=>m.bus.disk.mount(0,new Uint8Array(6656)),/NIB/);
 assert.throws(()=>m.bus.disk.mount(2,data),RangeError);
 m.bus.disk.mount(0,data);data[0]=0x21;
 m.bus.read(0xc0e9);
 assert.equal(m.bus.read(0xc0ec),0x91,'user-provided bytes are copied on mount');
});

test('drive select, motor and independent nibble positions',()=>{
 const m=new Apple2Infinity(),a=nib(0xa1),b=nib(0xb2);
 a[1]=0xa2;b[1]=0xb3;
 m.bus.disk.mount(0,a);m.bus.disk.mount(1,b);
 assert.equal(m.bus.read(0xc0ec),0,'motor off cannot read');
 m.bus.write(0xc0e9,0);assert.equal(m.bus.read(0xc0ec),0xa1);
 m.bus.read(0xc0eb);assert.equal(m.bus.read(0xc0ec),0xb2);
 m.bus.read(0xc0ea);assert.equal(m.bus.read(0xc0ec),0xa2);
 m.bus.read(0xc0e8);assert.equal(m.bus.read(0xc0ec),0);
 assert.equal(m.bus.disk.snapshot().drives[0].position,2);
 assert.equal(m.bus.disk.snapshot().drives[1].position,1);
});

test('virtual phase soft-switches step selected head and clamp tracks',()=>{
 const m=new Apple2Infinity(),d=m.bus.disk;d.mount(0,nib());
 m.bus.read(0xc0e1);m.bus.read(0xc0e3);m.bus.read(0xc0e0);
 assert.equal(d.snapshot().drives[0].halfTrack,1);
 m.bus.read(0xc0e5);m.bus.read(0xc0e2);
 assert.equal(d.snapshot().drives[0].track,1);
 m.bus.read(0xc0e3);m.bus.read(0xc0e4);
 assert.equal(d.snapshot().drives[0].halfTrack,1);
 m.bus.read(0xc0e1);m.bus.read(0xc0e2);
 assert.equal(d.snapshot().drives[0].halfTrack,0);
 m.bus.read(0xc0e2);assert.equal(d.snapshot().drives[0].halfTrack,0);
});

test('slot ROM executes user-supplied legal bytecode with no bundled firmware',()=>{
 const m=new Apple2Infinity(),b=m.bus;
 assert.equal(b.read(0xc600),0);
 assert.throws(()=>b.disk.loadBootROM(new Uint8Array(255)),RangeError);
 const program=new Uint8Array(256);
 program.set([0xa9,0x5e,0x8d,0x40,0x04,0x00]);
 b.disk.loadBootROM(program);program[1]=0;
 assert.equal(b.read(0xc601),0x5e);
 b.write(0xc601,0);assert.equal(b.read(0xc601),0x5e);
 m.cpu.reset(0xc600);
 assert.equal(m.cpu.run(20,{stopOnBrk:true}).halted,true);
 assert.equal(b.read(0x440),0x5e);
});

test('disk read clocking wraps after one NIB track without leaking into next track',()=>{
 const m=new Apple2Infinity(),data=nib(0xff);
 data[0]=0x11;data[NIB_TRACK_BYTES-1]=0x22;
 m.bus.disk.mount(0,data);m.bus.read(0xc0e9);
 assert.equal(m.bus.read(0xc0ec),0x11);
 for(let i=1;i<NIB_TRACK_BYTES-1;i++)m.bus.read(0xc0ec);
 assert.equal(m.bus.read(0xc0ec),0x22);
 assert.equal(m.bus.read(0xc0ec),0x11);
 assert.equal(m.bus.disk.snapshot().drives[0].position,1);
});

test('Q6/Q7 status and write protection prohibit image modification',()=>{
 const m=new Apple2Infinity(),data=nib(0xa0);
 m.bus.disk.mount(0,data,{writeProtected:true});m.bus.read(0xc0e9);
 m.bus.read(0xc0ed);assert.equal(m.bus.read(0xc0ed)&128,128);
 m.bus.read(0xc0ef);m.bus.write(0xc0ed,0xf3);m.bus.write(0xc0ec,0);
 m.bus.read(0xc0ee);assert.equal(m.bus.read(0xc0ec),0xa0);
 m.bus.disk.eject(0);assert.equal(m.bus.disk.snapshot().drives[0].mounted,false);
});

test('explicitly writable NIB writes selected track and exports an independent copy',()=>{
 const m=new Apple2Infinity(),data=nib(0xa0);
 m.bus.disk.mount(0,data,{writeProtected:false});m.bus.read(0xc0e9);
 m.bus.read(0xc0ef);m.bus.write(0xc0ed,0x96);m.bus.write(0xc0ec,0);
 m.bus.read(0xc0ee);
 assert.equal(m.bus.read(0xc0ec),0xa0);
 const copy=m.bus.disk.exportImage(0);
 assert.equal(copy[0],0x96);assert.equal(data[0],0xa0);
 copy[0]=0x42;assert.equal(m.bus.disk.exportImage(0)[0],0x96);
});

test('6502 reads floppy data using soft switches without ROM or external APIs',()=>{
 const m=new Apple2Infinity(),data=nib(0xff);
 data[0]=0x7b;m.bus.disk.mount(0,data);
 m.bus.load(0x800,[0xad,0xe9,0xc0,0xad,0xec,0xc0,0x8d,0x10,0x04,0x00]);
 assert.equal(m.cpu.run(20,{stopOnBrk:true}).halted,true);
 assert.equal(m.bus.read(0x410),0x7b);
 assert.equal(m.bus.disk.snapshot().drives[0].position,1);
});

test('browser has local NIB mount, user ROM, safe image export and disk controls',()=>{
 const html=readFileSync(new URL('../apple2-infinity/index.html',import.meta.url),'utf8');
 for(const id of ['diskFile','diskDrive','diskMount','diskMotor','diskEject','diskStatus','diskROMMount','diskExport'])
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.match(html,/\.arrayBuffer\(\)/);
 assert.match(html,/\.disk\.mount\(/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest/);
});
