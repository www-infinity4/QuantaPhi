import { Virtual6502 } from './cpu6502.mjs';
import { VirtualDisk2, DISK2_BASE, DISK2_ROM_BASE } from './disk2.mjs';
export { VirtualDisk2, DISK2_BASE, DISK2_ROM_BASE, NIB_TRACK_BYTES, NIB_TRACKS } from './disk2.mjs';
export { Virtual6502, LEGAL_OPCODES } from './cpu6502.mjs';
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
  readBlock(address,count) {if(!Number.isSafeInteger(address)||address<0||!Number.isSafeInteger(count)||count<0||count>8*1024*1024||address+count>this.size)throw RangeError('Invalid block');return Uint8Array.from({length:count},(_,i)=>this.read(address+i));}
  writeBlock(address,data) {if(!Number.isSafeInteger(address)||address<0||!data||!Number.isSafeInteger(data.length)||data.length<0||data.length>8*1024*1024||address+data.length>this.size)throw RangeError('Invalid memory block');for(let i=0;i<data.length;i++)this.write(address+i,data[i]);}
  get physicalBytes(){return this.pages.size*this.pageSize;}
}

export class VirtualVideo {
  constructor(bus) {
    this.bus=bus; this.ram=bus.ram; this.textMode=true;
    this.hires=false; this.mixed=false; this.page2=false;
    this.speakerEdges=0;
  }
  textAddress(row,col,base=0x400) {
    if(!Number.isInteger(row)||row<0||row>=24||!Number.isInteger(col)||col<0||col>=40)
      throw RangeError('40x24 text coordinates');
    return base+((row&7)<<7)+((row>>3)*40)+col;
  }
  get columns(){return this.bus.soft.col80?80:40;}
  get textBase(){return this.page2&&!this.bus.soft.store80?0x800:0x400;}
  // Video fetches physical main/aux RAM, not the CPU's RAMRD/RAMWRT window.
  visibleByte(row,col){
    const addr=this.textAddress(row,this.columns===80?Math.floor(col/2):col,this.textBase);
    const bank=this.columns===80?(col%2===0?this.bus.auxRam:this.ram)
      :(this.bus.soft.store80&&this.page2?this.bus.auxRam:this.ram);
    return bank[addr];
  }
  put(row,col,text){
    const str=String(text);
    for(let i=0;i<str.length&&col+i<this.columns;i++){
      const c=col+i,addr=this.textAddress(row,this.columns===80?Math.floor(c/2):c,this.textBase);
      const bank=this.columns===80?(c%2===0?this.bus.auxRam:this.ram)
        :(this.bus.soft.store80&&this.page2?this.bus.auxRam:this.ram);
      bank[addr]=str.charCodeAt(i)&0x7f;
    }
  }
  frame(){return Array.from({length:24},(_,r)=>Array.from({length:this.columns},(_,c)=>{
    const v=this.visibleByte(r,c)&0x7f;
    return v>=32&&v<=126?String.fromCharCode(v):' ';
  }).join('')).join('\n');}
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
  constructor(fpga){
    this.ram=new Uint8Array(65536);
    this.auxRam=new Uint8Array(65536);
    this.rom=new Uint8Array(0x3000);
    this.fpga=fpga;
    this.disk=new VirtualDisk2();
    this.soft={store80:false,ramrd:false,ramwrt:false,altzp:false,col80:false,altcharset:false};
    // Physically separate Language Card banks for main and auxiliary memory.
    const makeSide=()=>({bank1:new Uint8Array(0x1000),bank2:new Uint8Array(0x1000),high:new Uint8Array(0x2000)});
    this.lc={bank:2,readRAM:false,writeEnabled:false,prewrite:false,main:makeSide(),aux:makeSide()};
    this.video=new VirtualVideo(this);
    this.keyboard=0;this.cycles=0;this.phase=0;
  }
  key(value){this.keyboard=byte(typeof value==='string'?value.charCodeAt(0):value)|0x80;}
  // CPU bank routing; zero page/stack take ALTZP, and 80STORE+PAGE2 overrides
  // RAMRD/RAMWRT for text page 1, or hi-res page 1 when HIRES is enabled.
  bank(address,isWrite=false){
    if(address<0x200)return this.soft.altzp?this.auxRam:this.ram;
    const override=this.soft.store80&&(
      (address>=0x400&&address<0x800)||
      (this.video.hires&&address>=0x2000&&address<0x4000)
    );
    if(override)return this.video.page2?this.auxRam:this.ram;
    return (isWrite?this.soft.ramwrt:this.soft.ramrd)?this.auxRam:this.ram;
  }
  setMemorySwitch(address){
    const field={0:'store80',1:'store80',2:'ramrd',3:'ramrd',4:'ramwrt',5:'ramwrt',
      8:'altzp',9:'altzp',12:'col80',13:'col80',14:'altcharset',15:'altcharset'}[address&15];
    if(field)this.soft[field]=!!(address&1);
  }
  languageCardSwitch(address,isRead){
    // C080-C08F: bit 3 selects bank 1; bits 0-1 select read/write mode.
    // Odd reads implement the two-read write-enable latch.
    const mode=address&3;
    this.lc.bank=(address&8)?1:2;
    this.lc.readRAM=mode===0||mode===3;
    if((mode&1)&&isRead){
      this.lc.writeEnabled=this.lc.writeEnabled||this.lc.prewrite;
      this.lc.prewrite=true;
    }else{
      this.lc.prewrite=false;
      this.lc.writeEnabled=false;
    }
  }
  languageCardArray(address){
    const side=this.soft.altzp?this.lc.aux:this.lc.main;
    return address<0xe000?side[this.lc.bank===1?'bank1':'bank2']:side.high;
  }
  readLanguageCard(address){
    if(!this.lc.readRAM)return this.rom[address-0xd000];
    return this.languageCardArray(address)[address<0xe000?address-0xd000:address-0xe000];
  }
  writeLanguageCard(address,value){
    if(!this.lc.writeEnabled)return;
    this.languageCardArray(address)[address<0xe000?address-0xd000:address-0xe000]=value;
  }
  displaySwitch(address){
    const n=address&15,on=!!(n&1);
    switch(n>>1){
      case 0:this.video.textMode=on;break;
      case 1:this.video.mixed=on;break;
      case 2:this.video.page2=on;break;
      case 3:this.video.hires=on;break;
      default:break;
    }
  }
  status(address){
    const enabled={
      0x11:this.lc.bank===2,0x12:this.lc.readRAM,
      0x13:this.soft.ramrd,0x14:this.soft.ramwrt,0x16:this.soft.altzp,
      0x18:this.soft.store80,0x1a:this.video.textMode,0x1b:this.video.mixed,
      0x1c:this.video.page2,0x1d:this.video.hires,0x1e:this.soft.altcharset,
      0x1f:this.soft.col80
    }[address&255];
    // Only bit 7 is currently modeled; real bits 0-6 are floating-bus values.
    return enabled?0x80:0;
  }
  read(address){address&=0xffff;
    if(address>=0xc000&&address<=0xc00f)return this.keyboard;
    if(address===0xc010){const v=this.keyboard;this.keyboard&=0x7f;return v;}
    if(address>=0xc011&&address<=0xc01f)return this.status(address);
    if(address>=0xc050&&address<=0xc057){this.displaySwitch(address);return 0;}
    if(address>=0xc080&&address<=0xc08f){this.languageCardSwitch(address,true);return 0;}
    if(address>=DISK2_BASE&&address<DISK2_BASE+16)return this.disk.access(address-DISK2_BASE);
    if(address>=DISK2_ROM_BASE&&address<DISK2_ROM_BASE+256)return this.disk.readBootROM(address);
    if(address>=IO_BASE&&address<IO_BASE+16)return this.fpga.read(address-IO_BASE);
    if(address>=0xd000)return this.readLanguageCard(address);
    if(address<0xc000)return this.bank(address)[address];
    return this.ram[address]; // unmapped I/O stub, not accurate floating bus
  }
  write(address,value){address&=0xffff;value=byte(value);
    if(address>=0xc000&&address<=0xc00f){this.setMemorySwitch(address);return;}
    if(address>=0xc050&&address<=0xc057){this.displaySwitch(address);return;}
    if(address>=0xc080&&address<=0xc08f){this.languageCardSwitch(address,false);return;}
    if(address>=DISK2_BASE&&address<DISK2_BASE+16){this.disk.access(address-DISK2_BASE,value,true);return;}
    if(address>=IO_BASE&&address<IO_BASE+16){this.fpga.write(address-IO_BASE,value);return;}
    if(address===0xc030){this.video.speakerEdges++;return;}
    if(address>=0xd000){this.writeLanguageCard(address,value);return;}
    if(address<0xc000)this.bank(address,true)[address]=value;
  }
  // Developer loader intentionally writes physical main memory, not the active CPU bank.
  load(address,bytes){if(!Number.isInteger(address)||address<0||!bytes||!Number.isSafeInteger(bytes.length)||address+bytes.length>0xc000)throw RangeError('Load into RAM only');this.ram.set(bytes,address);}
  loadROM(address,bytes){if(!Number.isInteger(address)||address<0xd000||address+bytes.length>0x10000)throw RangeError('ROM image must remain in $D000–$FFFF');this.rom.set(bytes,address-0xd000);}
  tick(){this.cycles++;this.phase^=1;this.fpga.tick();}
}

export class Apple2Infinity {
  constructor(){this.sensors=new VirtualSensors();this.cm5=new VirtualCM5();this.fpga=new VirtualFPGA(this.cm5,this.sensors);this.bus=new VirtualAppleBus(this.fpga);this.cpu=new Virtual6502(this.bus);}
  demo(){// 7 + 9 -> software CM5 result $C0F8; CPU stores the returned low byte at $0400.
    const program=[0xa9,7,0x8d,0xf4,0xc0,0xa9,0,0x8d,0xf5,0xc0,0xa9,9,0x8d,0xf6,0xc0,0xa9,0,0x8d,0xf7,0xc0,
      0xa9,1,0x8d,0xf0,0xc0,0xad,0xf1,0xc0,0x29,2,0xf0,0xf9,0xad,0xf8,0xc0,0x8d,0x00,0x04,0x00];
    this.cpu.reset();this.bus.load(0x800,program);const result=this.cpu.run(10000,{stopOnBrk:true});return {...result,result:this.bus.read(0x400)};
  }
  snapshot(){return {cpu:{a:this.cpu.a,x:this.cpu.x,y:this.cpu.y,pc:this.cpu.pc,cycles:this.bus.cycles},fpga:{status:this.fpga.reg[1],irq:this.fpga.irq,logic:this.fpga.gate,ramPhysical:this.fpga.ram.physicalBytes},cm5:{jobs:this.cm5.jobs,ramPhysical:this.cm5.ram.physicalBytes},sensors:{samples:this.sensors.samples,dac:this.sensors.dac},mmu:{...this.bus.soft,page2:this.bus.video.page2,hires:this.bus.video.hires,textMode:this.bus.video.textMode,mixed:this.bus.video.mixed,columns:this.bus.video.columns},languageCard:{bank:this.bus.lc.bank,readRAM:this.bus.lc.readRAM,writeEnabled:this.bus.lc.writeEnabled,aux:this.bus.soft.altzp},disk:this.bus.disk.snapshot(),screen:this.bus.video.frame()};}
}