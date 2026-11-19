import test from 'node:test';
import assert from 'node:assert/strict';
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
