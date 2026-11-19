import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Apple2Infinity,PagedMemory,IO_BASE,STATUS} from '../apple2-infinity/core.mjs';

test('software-only 6502 launches CM5 calculation through the slot 7 FPGA registers',()=>{
 const m=new Apple2Infinity(),result=m.demo();
 assert.equal(IO_BASE,0xc0f0);assert.equal(result.halted,true);assert.equal(result.result,16);
 assert.equal(m.bus.read(0xc0f8),16);assert.equal(m.bus.read(0xc0f1),STATUS.DONE);assert.equal(m.cm5.jobs,1);
 assert.ok(m.bus.cycles>0);assert.equal(m.bus.read(0x0400),16);
});
test('FPGA coprocessor handles 16-bit multiplication and IRQ acknowledgement',()=>{
 const m=new Apple2Infinity();m.bus.write(0xc0f3,1);
 [0x34,0x12,2,0].forEach((v,i)=>m.bus.write(0xc0f4+i,v));m.bus.write(0xc0f0,2);
 assert.equal(m.bus.read(0xc0f1),STATUS.BUSY);for(let i=0;i<3;i++)m.bus.tick();
 assert.equal(m.bus.read(0xc0f1),STATUS.DONE);assert.equal(m.fpga.irq,true);
 assert.equal(m.bus.read(0xc0f8)|(m.bus.read(0xc0f9)<<8),0x2468);
 m.bus.write(0xc0f1,STATUS.DONE);assert.equal(m.fpga.irq,false);
});
test('ADC and DAC are simulated, deterministic and clamped',()=>{
 const m=new Apple2Infinity();m.sensors.setInput(2,2048);m.bus.write(0xc0f4,2);m.bus.write(0xc0f0,3);
 for(let i=0;i<3;i++)m.bus.tick();assert.equal(m.bus.read(0xc0f8)|(m.bus.read(0xc0f9)<<8),1023);
 m.bus.write(0xc0f2,200);assert.equal(m.sensors.dac,200);
});
test('DMA transfers safely between Apple RAM and virtual FPGA SDRAM',()=>{
 const m=new Apple2Infinity();m.bus.load(0x0800,[1,2,3,4]);
 assert.equal(m.fpga.dma(m.bus,0x0800,0x1000,4),4);assert.deepEqual([...m.fpga.ram.readBlock(0x1000,4)],[1,2,3,4]);
 m.fpga.ram.write(0x1000,42);m.fpga.dma(m.bus,0x0800,0x1000,4,'to-apple');assert.equal(m.bus.read(0x0800),42);
 assert.throws(()=>m.fpga.dma(m.bus,0xbfff,0x1000,2),RangeError);
});
test('logical multi-gigabyte CM5 memory is sparse, with bounded access',()=>{
 const m=new PagedMemory(8*1024**3);assert.equal(m.physicalBytes,0);
 m.write(8*1024**3-1,219);assert.equal(m.read(8*1024**3-1),219);assert.equal(m.physicalBytes,4096);
 assert.throws(()=>m.read(8*1024**3),RangeError);
});
test('FPGA can reconfigure deterministic digital logic',()=>{
 const m=new Apple2Infinity();assert.equal(m.fpga.logic(0xf0,0xaa),0x5a);
 m.fpga.configureGate('AND');assert.equal(m.fpga.logic(0xf0,0xaa),0xa0);
 assert.throws(()=>m.fpga.configureGate('GPU'));
});
test('Apple II 40-column interleaved text buffer and keyboard work',()=>{
 const m=new Apple2Infinity();m.bus.video.put(9,0,'INFINITY');assert.ok(m.bus.video.frame().split('\n')[9].startsWith('INFINITY'));
 m.bus.key('A');assert.equal(m.bus.read(0xc000),0xc1);assert.equal(m.bus.read(0xc010),0xc1);assert.equal(m.bus.read(0xc000),0x41);
});
test('CM5 network stays offline and the 6502 refuses unknown instructions',()=>{
 const m=new Apple2Infinity();assert.equal(m.cm5.enqueueNetwork('hello'),1);assert.equal(m.cm5.networkLog[0].mode,'offline');
 m.bus.load(0x800,[0x02]);assert.throws(()=>m.cpu.step(),/Unimplemented/);
});

test('6502 supports documented NMOS instruction table and indexed zero-page wrapping',()=>{
 const m=new Apple2Infinity();
 assert.equal(m.cpu.legalOpcodes.length,151);
 m.bus.load(0x800,[0xa2,1,0xa9,0x7f,0x95,0xff,0xb5,0xff,0x8d,0x00,0x04,0x00]);
 assert.equal(m.cpu.run(50,{stopOnBrk:true}).halted,true);
 assert.equal(m.bus.read(0x00),0x7f);
 assert.equal(m.bus.read(0x400),0x7f);
});

test('6502 indirect indexed addressing wraps zero page and accounts for read page crossings',()=>{
 const m=new Apple2Infinity();
 m.bus.write(0x00ff,0xff);m.bus.write(0x0000,0x02);m.bus.write(0x0300,0x44);
 m.bus.load(0x800,[0xa0,1,0xb1,0xff,0x00]);
 m.cpu.run(10,{stopOnBrk:true});
 assert.equal(m.cpu.a,0x44);
 assert.equal(m.bus.cycles,2+6+7); // LDY=2, LDA (zp),Y 5+1, BRK=7
});

test('6502 arithmetic sets binary overflow and negative flags and decimal carry',()=>{
 const m=new Apple2Infinity();
 m.bus.load(0x800,[0x18,0xa9,0x7f,0x69,0x01,0x38,0xe9,0x01,0xf8,0x18,0xa9,0x45,0x69,0x55,0x00]);
 const cpu=m.cpu;
 cpu.step();cpu.step();cpu.step();
 assert.equal(cpu.a,0x80);assert.ok(cpu.p&0x40,'signed overflow');assert.ok(cpu.p&0x80,'negative');
 cpu.step();cpu.step();assert.equal(cpu.a,0x7f);
 cpu.step();cpu.step();cpu.step();cpu.step();
 assert.equal(cpu.a,0x00);assert.ok(cpu.p&1,'decimal carry');
});

test('6502 pushes BRK return address, uses IRQ vector, and RTI restores program',()=>{
 const m=new Apple2Infinity();
 m.bus.loadROM(0xfffe,[0x00,0x09]);
 m.bus.load(0x800,[0x00,0xea,0xa9,0x42,0xea]);
 m.bus.load(0x900,[0x40]); // RTI
 m.cpu.step();assert.equal(m.cpu.pc,0x900);assert.equal(m.cpu.sp,0xfa);
 assert.equal(m.bus.read(0x1fc),0x02);assert.equal(m.bus.read(0x1fd),0x08);
 assert.ok(m.bus.read(0x1fb)&0x10,'BRK pushes the B bit');
 m.cpu.step();assert.equal(m.cpu.pc,0x802);
 m.cpu.step();assert.equal(m.cpu.a,0x42);
});

test('6502 stack, subroutine, shifts and indirect JMP wrap behave as NMOS',()=>{
 const m=new Apple2Infinity();
 m.bus.write(0x12ff,0x34);m.bus.write(0x1200,0x12);
 m.bus.load(0x800,[0x20,0x10,0x08,0x6c,0xff,0x12]);
 m.bus.load(0x810,[0xa9,0x81,0x0a,0x48,0x68,0x60]);
 m.cpu.step();assert.equal(m.cpu.pc,0x810);
 for(let i=0;i<5;i++)m.cpu.step();
 assert.equal(m.cpu.a,0x02);assert.ok(m.cpu.p&1,'carry after ASL');
 m.cpu.step();assert.equal(m.cpu.pc,0x1234);
});

test('6502 IRQ respects interrupt disable and independent NMI always vectors',()=>{
 const m=new Apple2Infinity();
 m.bus.loadROM(0xfffa,[0x00,0x09,0x00,0x00,0x20,0x09]);
 m.bus.load(0x800,[0x78,0xea,0x58,0xea]);
 m.bus.load(0x900,[0x40]);m.bus.load(0x920,[0x40]);
 m.cpu.step();m.cpu.requestIRQ();m.cpu.step();assert.equal(m.cpu.pc,0x802,'SEI masks IRQ');
 m.cpu.step();m.cpu.step();assert.equal(m.cpu.pc,0x920,'IRQ vector after CLI');
 m.cpu.requestIRQ(false);m.cpu.step();assert.equal(m.cpu.pc,0x803);
 m.cpu.requestNMI();m.cpu.step();assert.equal(m.cpu.pc,0x900,'NMI non-maskable');
});

test('RAM block validation refuses partial boundary writes',()=>{
 const m=new PagedMemory(4096);
 assert.throws(()=>m.writeBlock(4095,[1,2]),RangeError);
 assert.equal(m.read(4095),0);
 assert.throws(()=>m.readBlock(-1,2),RangeError);
 assert.throws(()=>m.readBlock(0,9_000_000),RangeError);
});

test('each documented NMOS opcode has a dispatch path and advances at least one virtual cycle',()=>{
 const catalog=new Apple2Infinity().cpu.legalOpcodes;
 for(const opcode of catalog){
  const m=new Apple2Infinity();
  m.bus.load(0x800,[opcode,0,0,0]);
  assert.doesNotThrow(()=>m.cpu.step(),'opcode $'+opcode.toString(16).padStart(2,'0'));
  assert.equal(m.cpu.instructions,1);
  assert.ok(m.bus.cycles>=2);
 }
});

test('6502 sets carry and zero on BCD subtraction and exposes reset vector',()=>{
 const m=new Apple2Infinity();
 m.bus.loadROM(0xfffc,[0x10,0x08]);m.cpu.resetFromVector();assert.equal(m.cpu.pc,0x0810);
 m.bus.load(0x0810,[0xf8,0x38,0xa9,0x00,0xe9,0x01]);
 for(let i=0;i<4;i++)m.cpu.step();
 assert.equal(m.cpu.a,0x99);assert.equal(m.cpu.p&1,0);assert.ok(m.cpu.p&0x80);
});

test('6502 flag transfers, branches and memory shifts preserve register semantics',()=>{
 const m=new Apple2Infinity();
 m.bus.load(0x800,[0xa9,0x80,0xaa,0x8a,0x0a,0x85,0x10,0x46,0x10,0xa5,0x10,0xc9,0x00,0xf0,0x02,0xa9,0xff,0x00]);
 m.cpu.run(50,{stopOnBrk:true});
 assert.equal(m.cpu.a,0x00);assert.equal(m.cpu.x,0x80);
 assert.equal(m.bus.read(0x10),0);assert.ok(m.cpu.p&2,'zero after compare');
});

test('browser workbench exposes bounded hex loader and step/run controls without external APIs',()=>{
 const html=readFileSync(new URL('../apple2-infinity/index.html',import.meta.url),'utf8');
 for(const id of ['programHex','loadProgram','stepProgram','runProgram','programStatus','run','dma','screen'])
  assert.ok(html.includes(`id="${id}"`),`missing ${id}`);
 assert.match(html,/bytes\.length>4096/);
 assert.match(html,/\.run\(2000,\{stopOnBrk:true\}\)/);
 assert.doesNotMatch(html,/https?:\/\/(?:.*)?api\./i,'offline page must not rely on remote API calls');
});


test('6502 stores write their destination without an unintended I/O read',()=>{
 const m=new Apple2Infinity();
 m.bus.load(0x800,[0xa9,0x2a,0x8d,0xf2,0xc0]);
 const old=m.bus.read.bind(m.bus);let destinationReads=0;
 m.bus.read=addr=>{if(addr===0xc0f2)destinationReads++;return old(addr);};
 m.cpu.step();m.cpu.step();
 assert.equal(destinationReads,0);
 assert.equal(m.sensors.dac,42);
});