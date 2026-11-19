/* Apple II Infinity: original, dependency-free software components.
   This is a functional teaching/workbench model, NOT a cycle-accurate Apple IIe or full 6502. */
export const APPLE_HZ = 1_023_000;
export const IO_BASE = 0xC0F0; // slot 7 DEVSEL window, illustrative assignment
export const STATUS = Object.freeze({BUSY:1, DONE:2, ERROR:4});
const byte = n => Number(n) & 255;

// Virtual physically-addressed memory: pages allocated only on first write.
export class PagedMemory {
  constructor(size, pageBits=12) {
    if (!Number.isSafeInteger(size) || size <= 0) throw Error('Invalid memory size');
    this.size=size; this.bits=pageBits; this.pages=new Map(); this.pageSize=2**pageBits;
  }
  check(address) {if (!Number.isSafeInteger(address) || address<0 || address>=this.size) throw RangeError('Memory address out of range');}
  read(address) {this.check(address);return this.pages.get(Math.floor(address/this.pageSize))?.[address%this.pageSize]??0;}
  write(address,value) {this.check(address); const p=Math.floor(address/this.pageSize);if(!this.pages.has(p))this.pages.set(p,new Uint8Array(this.pageSize));this.pages.get(p)[address%this.pageSize]=byte(value);}
  readBlock(address,count) {if(!Number.isSafeInteger(count)||count<0||address+count>this.size)throw RangeError('Invalid block');return Uint8Array.from({length:count},(_,i)=>this.read(address+i));}
  writeBlock(address,data) {for(let i=0;i<data.length;i++)this.write(address+i,data[i]);}
  get physicalBytes(){return this.pages.size*this.pageSize;}
}

export class VirtualVideo {
  constructor(ram){this.ram=ram;this.textMode=true;this.hires=false;this.speakerEdges=0;}
  textAddress(row,col) {
    if(!Number.isInteger(row)||row<0||row>=24||!Number.isInteger(col)||col<0||col>=40)throw RangeError('40x24 text coordinates');
    return 0x400+((row&7)<<7)+((row>>3)*40)+col;
  }
  put(row,col,text){for(let i=0;i<String(text).length&&col+i<40;i++)this.ram[this.textAddress(row,col+i)]=String(text).charCodeAt(i)&0x7f;}
  frame(){return Array.from({length:24},(_,r)=>Array.from({length:40},(_,c)=>{const v=this.ram[this.textAddress(r,c)]&0x7f;return v>=32&&v<=126?String.fromCharCode(v):' ';}).join('')).join('\n');}
}

export class VirtualSensors {
  constructor(){this.samples=0;this.dac=0;this.inputs=new Map([[0,512]]);}
  setInput(channel,level){if(!Number.isInteger(channel)||channel<0||channel>7||!Number.isFinite(level))throw Error('Invalid ADC input');this.inputs.set(channel,Math.max(0,Math.min(1023,Math.round(level))));}
  sample(channel=0){this.samples++;return this.inputs.get(channel)??0;}
  setDAC(level){this.dac=Math.max(0,Math.min(255,byte(level)));}
}

export class VirtualCM5 {
  constructor(){this.ram=new PagedMemory(8*1024**3);this.jobs=0;this.networkLog=[];}
  calculate(op,params,sensors){this.jobs++;
    const left=params[0]|(params[1]<<8),right=params[2]|(params[3]<<8);
    if(op===1)return (left+right)>>>0;
    if(op===2)return Math.imul(left,right)>>>0;
    if(op===3)return sensors.sample(params[0]&7)>>>0;
    throw Error('Unsupported coprocessor command');
  }
  enqueueNetwork(message){if(typeof message!=='string'||message.length>256)throw Error('Message length invalid');this.networkLog.push({mode:'offline',message});return this.networkLog.length;}
}

export class VirtualFPGA {
  constructor(cm5,sensors){this.ram=new PagedMemory(64*1024**2);this.cm5=cm5;this.sensors=sensors;this.reg=new Uint8Array(16);this.pending=null;this.irq=false;this.gate='XOR';this.dmaActive=false;}
  read(offset){if(offset===1)return this.reg[1];return this.reg[offset];}
  write(offset,value){value=byte(value);
    if(offset===0){this.reg[0]=value;this.launch(value);return;}
    if(offset===1){if(value&STATUS.DONE){this.reg[1]&=~STATUS.DONE;this.irq=false;}if(value&STATUS.ERROR)this.reg[1]&=~STATUS.ERROR;return;}
    if(offset===3){this.reg[3]=value;return;}
    if(offset===2){this.sensors.setDAC(value);this.reg[2]=value;return;}
    this.reg[offset]=value;
  }
  launch(op){if(this.pending){this.reg[1]|=STATUS.ERROR;return;}
    this.reg[1]=STATUS.BUSY;this.irq=false;
    this.pending={op,params:[...this.reg.slice(4,8)],ticks:3};
  }
  tick(){if(!this.pending)return;this.pending.ticks--;if(this.pending.ticks>0)return;
    const {op,params}=this.pending;this.pending=null;
    try{const result=this.cm5.calculate(op,params,this.sensors);for(let i=0;i<4;i++)this.reg[8+i]=result>>>(8*i)&255;this.reg[1]=STATUS.DONE;if(this.reg[3]&1)this.irq=true;}
    catch{this.reg[1]=STATUS.ERROR;this.irq=false;}
  }
  configureGate(name){if(!['AND','OR','XOR','NAND'].includes(name))throw Error('Unsupported FPGA gate');this.gate=name;}
  logic(a,b){const x=byte(a),y=byte(b);return ({AND:()=>x&y,OR:()=>x|y,XOR:()=>x^y,NAND:()=>~(x&y)&255})[this.gate]();}
  dma(bus,ramAddress,fpgaAddress,length,direction='to-fpga'){
    if(this.dmaActive||this.pending)throw Error('DMA busy');
    if(!Number.isInteger(length)||length<0||length>4096||!Number.isInteger(ramAddress)||ramAddress<0||ramAddress+length>0xc000)throw RangeError('DMA must remain in Apple RAM, max 4096 bytes');
    if(!Number.isInteger(fpgaAddress)||fpgaAddress<0||fpgaAddress+length>this.ram.size)throw RangeError('FPGA memory boundary');
    if(!['to-fpga','to-apple'].includes(direction))throw Error('Invalid direction');
    this.dmaActive=true;
    try{for(let i=0;i<length;i++){if(direction==='to-fpga')this.ram.write(fpgaAddress+i,bus.ram[ramAddress+i]);else bus.ram[ramAddress+i]=this.ram.read(fpgaAddress+i);}}
    finally{this.dmaActive=false;}
    return length;
  }
}

export class VirtualAppleBus {
  constructor(fpga){this.ram=new Uint8Array(65536);this.rom=new Uint8Array(0x3000);this.fpga=fpga;this.video=new VirtualVideo(this.ram);this.keyboard=0;this.cycles=0;this.phase=0;}
  key(value){this.keyboard=byte(typeof value==='string'?value.charCodeAt(0):value)|0x80;}
  read(address){address&=0xffff;
    if(address===0xc000)return this.keyboard;
    if(address===0xc010){const v=this.keyboard;this.keyboard&=0x7f;return v;}
    if(address>=IO_BASE&&address<IO_BASE+16)return this.fpga.read(address-IO_BASE);
    if(address>=0xd000)return this.rom[address-0xd000];
    return this.ram[address];
  }
  write(address,value){address&=0xffff;value=byte(value);
    if(address>=IO_BASE&&address<IO_BASE+16){this.fpga.write(address-IO_BASE,value);return;}
    if(address===0xc030){this.video.speakerEdges++;return;}
    if(address===0xc050){this.video.textMode=false;return;}
    if(address===0xc051){this.video.textMode=true;return;}
    if(address===0xc056){this.video.hires=false;return;}
    if(address===0xc057){this.video.hires=true;return;}
    if(address<0xc000)this.ram[address]=value;
  }
  load(address,bytes){if(address<0||address+bytes.length>0xc000)throw RangeError('Load into RAM only');this.ram.set(bytes,address);}
  tick(){this.cycles++;this.phase^=1;this.fpga.tick();}
}

// Focused 6502 instruction interpreter. Unimplemented opcodes fail loudly.
export class Virtual6502 {
  constructor(bus){this.bus=bus;this.reset();}
  reset(pc=0x800){this.a=0;this.x=0;this.y=0;this.sp=0xfd;this.pc=pc;this.p=0x20;this.halted=false;this.instructions=0;}
  setZN(v){this.p=(this.p&~0x82)|(v===0?2:0)|(v&0x80);}
  fetch(){return this.bus.read(this.pc++ & 0xffff);}
  abs(){const lo=this.fetch();return lo|(this.fetch()<<8);}
  push(v){this.bus.write(0x100+this.sp--,v);}
  pull(){return this.bus.read(0x100+(++this.sp&255));}
  step(){if(this.halted)return 0;if(this.bus.fpga.dmaActive)throw Error('CPU paused during DMA');
    const opcode=this.fetch();let cycles=2;
    switch(opcode){
      case 0xa9:this.a=this.fetch();this.setZN(this.a);break;
      case 0xa2:this.x=this.fetch();this.setZN(this.x);break;
      case 0xa0:this.y=this.fetch();this.setZN(this.y);break;
      case 0xad:this.a=this.bus.read(this.abs());this.setZN(this.a);cycles=4;break;
      case 0xae:this.x=this.bus.read(this.abs());this.setZN(this.x);cycles=4;break;
      case 0x8d:this.bus.write(this.abs(),this.a);cycles=4;break;
      case 0x8e:this.bus.write(this.abs(),this.x);cycles=4;break;
      case 0x8c:this.bus.write(this.abs(),this.y);cycles=4;break;
      case 0x29:this.a&=this.fetch();this.setZN(this.a);break;
      case 0x09:this.a|=this.fetch();this.setZN(this.a);break;
      case 0x49:this.a^=this.fetch();this.setZN(this.a);break;
      case 0xc9:{const v=this.fetch(),d=(this.a-v)&255;this.p=(this.p&~0x83)|(this.a>=v?1:0)|(d===0?2:0)|(d&128);break;}
      case 0x69:{const v=this.fetch(),total=this.a+v+(this.p&1);this.p=(this.p&~1)|(total>255?1:0);this.a=total&255;this.setZN(this.a);break;}
      case 0xe8:this.x=(this.x+1)&255;this.setZN(this.x);break;
      case 0xca:this.x=(this.x-1)&255;this.setZN(this.x);break;
      case 0x4c:this.pc=this.abs();cycles=3;break;
      case 0xf0:{const b=this.fetch();if(this.p&2){this.pc=(this.pc+(b<128?b:b-256))&0xffff;cycles++;}break;}
      case 0xd0:{const b=this.fetch();if(!(this.p&2)){this.pc=(this.pc+(b<128?b:b-256))&0xffff;cycles++;}break;}
      case 0x20:{const target=this.abs(),ret=(this.pc-1)&0xffff;this.push(ret>>8);this.push(ret);this.pc=target;cycles=6;break;}
      case 0x60:this.pc=(((this.pull())|(this.pull()<<8))+1)&0xffff;cycles=6;break;
      case 0xea:break;
      case 0x00:this.halted=true;cycles=7;break; // demo sentinel, NOT hardware BRK interrupt behavior
      default:throw Error('Unimplemented 6502 opcode $'+opcode.toString(16).padStart(2,'0')+' at $'+((this.pc-1)&0xffff).toString(16));
    }
    this.instructions++;for(let i=0;i<cycles;i++)this.bus.tick();return cycles;
  }
  run(limit=10000){let steps=0;while(!this.halted&&steps<limit){this.step();steps++;}return {steps,halted:this.halted,pc:this.pc,cycles:this.bus.cycles};}
}

export class Apple2Infinity {
  constructor(){this.sensors=new VirtualSensors();this.cm5=new VirtualCM5();this.fpga=new VirtualFPGA(this.cm5,this.sensors);this.bus=new VirtualAppleBus(this.fpga);this.cpu=new Virtual6502(this.bus);}
  demo(){// 7 + 9 -> software CM5 result $C0F8; CPU stores the returned low byte at $0400.
    const program=[0xa9,7,0x8d,0xf4,0xc0,0xa9,0,0x8d,0xf5,0xc0,0xa9,9,0x8d,0xf6,0xc0,0xa9,0,0x8d,0xf7,0xc0,
      0xa9,1,0x8d,0xf0,0xc0,0xad,0xf1,0xc0,0x29,2,0xf0,0xf9,0xad,0xf8,0xc0,0x8d,0x00,0x04,0x00];
    this.cpu.reset();this.bus.load(0x800,program);const result=this.cpu.run();return {...result,result:this.bus.read(0x400)};
  }
  snapshot(){return {cpu:{a:this.cpu.a,x:this.cpu.x,y:this.cpu.y,pc:this.cpu.pc,cycles:this.bus.cycles},fpga:{status:this.fpga.reg[1],irq:this.fpga.irq,logic:this.fpga.gate,ramPhysical:this.fpga.ram.physicalBytes},cm5:{jobs:this.cm5.jobs,ramPhysical:this.cm5.ram.physicalBytes},sensors:{samples:this.sensors.samples,dac:this.sensors.dac},screen:this.bus.video.frame()};}
}
