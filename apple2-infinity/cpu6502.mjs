/* Apple II Infinity documented NMOS 6502 interpreter.
   151 official opcodes; instruction-level cycle accounting, not bus-cycle timing.
   Undefined/undocumented opcodes are deliberately rejected. No ROM is bundled. */
const C=1,Z=2,I=4,D=8,B=16,U=32,V=64,N=128;
const TABLE=new Array(256);
function define(name, entries){
  for(const entry of entries.trim().split(/\s+/)){
    const [mode,hex,cycles]=entry.split(':');
    const opcode=parseInt(hex,16);
    if(!Number.isInteger(opcode)||TABLE[opcode])throw Error('Invalid or duplicate 6502 opcode '+entry);
    TABLE[opcode]={name,mode,cycles:+cycles,page: ['absx','absy','indy'].includes(mode)&&!['STA','STX','STY','ASL','LSR','ROL','ROR','INC','DEC'].includes(name)};
  }
}
const alu='imm zp zpx abs absx absy indx indy'.split(' ');
const alus={
 ORA:'09 05 15 0d 1d 19 01 11',AND:'29 25 35 2d 3d 39 21 31',
 EOR:'49 45 55 4d 5d 59 41 51',ADC:'69 65 75 6d 7d 79 61 71',
 SBC:'e9 e5 f5 ed fd f9 e1 f1',CMP:'c9 c5 d5 cd dd d9 c1 d1',
 LDA:'a9 a5 b5 ad bd b9 a1 b1'
};
for(const [name,codes] of Object.entries(alus))define(name,codes.split(' ').map((hex,i)=>`${alu[i]}:${hex}:${[2,3,4,4,4,4,6,5][i]}`).join(' '));
for(const [name,items] of Object.entries({
 STA:'zp:85:3 zpx:95:4 abs:8d:4 absx:9d:5 absy:99:5 indx:81:6 indy:91:6',
 LDX:'imm:a2:2 zp:a6:3 zpy:b6:4 abs:ae:4 absy:be:4',
 LDY:'imm:a0:2 zp:a4:3 zpx:b4:4 abs:ac:4 absx:bc:4',
 STX:'zp:86:3 zpy:96:4 abs:8e:4', STY:'zp:84:3 zpx:94:4 abs:8c:4',
 CPX:'imm:e0:2 zp:e4:3 abs:ec:4',CPY:'imm:c0:2 zp:c4:3 abs:cc:4',
 BIT:'zp:24:3 abs:2c:4',
 ASL:'acc:0a:2 zp:06:5 zpx:16:6 abs:0e:6 absx:1e:7',
 ROL:'acc:2a:2 zp:26:5 zpx:36:6 abs:2e:6 absx:3e:7',
 LSR:'acc:4a:2 zp:46:5 zpx:56:6 abs:4e:6 absx:5e:7',
 ROR:'acc:6a:2 zp:66:5 zpx:76:6 abs:6e:6 absx:7e:7',
 DEC:'zp:c6:5 zpx:d6:6 abs:ce:6 absx:de:7',
 INC:'zp:e6:5 zpx:f6:6 abs:ee:6 absx:fe:7',
 INX:'imp:e8:2', INY:'imp:c8:2',DEX:'imp:ca:2',DEY:'imp:88:2',
 TAX:'imp:aa:2',TXA:'imp:8a:2',TAY:'imp:a8:2',TYA:'imp:98:2',
 TSX:'imp:ba:2',TXS:'imp:9a:2',
 PHA:'imp:48:3',PLA:'imp:68:4',PHP:'imp:08:3',PLP:'imp:28:4',
 JMP:'abs:4c:3 ind:6c:5',JSR:'abs:20:6',RTS:'imp:60:6',RTI:'imp:40:6',BRK:'imp:00:7',
 BPL:'rel:10:2',BMI:'rel:30:2',BVC:'rel:50:2',BVS:'rel:70:2',
 BCC:'rel:90:2',BCS:'rel:b0:2',BNE:'rel:d0:2',BEQ:'rel:f0:2',
 CLC:'imp:18:2',SEC:'imp:38:2',CLI:'imp:58:2',SEI:'imp:78:2',
 CLV:'imp:b8:2',CLD:'imp:d8:2',SED:'imp:f8:2',NOP:'imp:ea:2'
}))define(name,items);
export const LEGAL_OPCODES=Object.freeze(TABLE.map((x,i)=>x?i:null).filter(x=>x!==null));
if(LEGAL_OPCODES.length!==151)throw Error(`Expected 151 documented NMOS 6502 opcodes, got ${LEGAL_OPCODES.length}`);

export class Virtual6502 {
  constructor(bus){this.bus=bus;this.legalOpcodes=LEGAL_OPCODES;this.reset();}
  reset(pc=0x800){
    this.a=0;this.x=0;this.y=0;this.sp=0xfd;this.pc=pc&0xffff;
    this.p=U|I;this.halted=false;this.instructions=0;
    this.irqLine=false;this.nmiPending=false;this.stopOnBrk=false;
  }
  resetFromVector(){this.reset(this.read16(0xfffc));}
  flag(mask){return (this.p&mask)!==0;}
  setFlag(mask,on){this.p=on?this.p|mask:this.p&~mask;this.p|=U;}
  setZN(value){const v=value&255;this.setFlag(Z,v===0);this.setFlag(N,!!(v&128));}
  fetch(){const v=this.bus.read(this.pc);this.pc=(this.pc+1)&0xffff;return v;}
  abs(){const lo=this.fetch();return lo|(this.fetch()<<8);}
  read16(addr){return this.bus.read(addr)|this.bus.read((addr+1)&0xffff)<<8;}
  readZP16(addr){return this.bus.read(addr&255)|this.bus.read((addr+1)&255)<<8;}
  push(v){this.bus.write(0x100+this.sp,v);this.sp=(this.sp-1)&255;}
  pull(){this.sp=(this.sp+1)&255;return this.bus.read(0x100+this.sp);}
  requestIRQ(active=true){this.irqLine=!!active;}
  requestNMI(){this.nmiPending=true;}
  interrupt(vector,breakFlag=false){
    this.push(this.pc>>8);this.push(this.pc&255);
    this.push((this.p|U|(breakFlag?B:0))&~(breakFlag?0:B));
    this.setFlag(I,true);this.pc=this.read16(vector);
  }
  address(mode){
    let addr,base,crossed=false;
    switch(mode){
      case 'imm':return {value:this.fetch(),crossed};
      case 'acc':return {value:this.a,crossed};
      case 'imp':return {crossed};
      case 'zp':addr=this.fetch();break;
      case 'zpx':addr=(this.fetch()+this.x)&255;break;
      case 'zpy':addr=(this.fetch()+this.y)&255;break;
      case 'abs':addr=this.abs();break;
      case 'absx':case 'absy':
        base=this.abs();addr=(base+(mode==='absx'?this.x:this.y))&0xffff;
        crossed=(base&0xff00)!==(addr&0xff00);break;
      case 'indx':addr=this.readZP16((this.fetch()+this.x)&255);break;
      case 'indy':base=this.readZP16(this.fetch());addr=(base+this.y)&0xffff;
        crossed=(base&0xff00)!==(addr&0xff00);break;
      case 'rel':return {offset:this.fetch(),crossed};
      case 'ind':{
        const pointer=this.abs();const lo=this.bus.read(pointer);
        const hi=this.bus.read((pointer&0xff00)|((pointer+1)&255));
        return {addr:lo|(hi<<8),crossed};
      }
      default:throw Error('Unsupported addressing mode '+mode);
    }
    return {addr,crossed};
  }
  adc(value){
    const a=this.a,v=value&255,c=this.flag(C)?1:0,raw=a+v+c,binary=raw&255;
    this.setFlag(V,!!(~(a^v)&(a^binary)&128));
    // NMOS N/Z update from binary intermediate in decimal mode.
    this.setZN(binary);
    if(this.flag(D)){
      let lo=(a&15)+(v&15)+c;
      if(lo>9)lo+=6;
      let adjusted=(a&240)+(v&240)+(lo&15)+(lo>15?16:0);
      if(adjusted>0x90)adjusted+=0x60;
      this.setFlag(C,adjusted>255);this.a=adjusted&255;
    }else{this.setFlag(C,raw>255);this.a=binary;}
  }
  sbc(value){
    const a=this.a,v=value&255,borrow=this.flag(C)?0:1,raw=a-v-borrow,binary=raw&255;
    this.setFlag(V,!!((a^binary)&(a^v)&128));this.setZN(binary);
    this.setFlag(C,raw>=0);
    if(this.flag(D)){
      let lo=(a&15)-(v&15)-borrow,hi=(a>>4)-(v>>4);
      if(lo<0){lo-=6;hi--;}
      if(hi<0)hi-=6;
      this.a=((hi<<4)|(lo&15))&255;
    }else this.a=binary;
  }
  compare(a,b){const result=(a-b)&255;this.setFlag(C,a>=b);this.setZN(result);}
  step(){
    if(this.halted)return 0;
    if(this.bus.fpga.dmaActive)throw Error('CPU paused during DMA');
    if(this.nmiPending||(this.irqLine||this.bus.fpga.irq)&&!this.flag(I)){
      const nmi=this.nmiPending;this.nmiPending=false;
      this.interrupt(nmi?0xfffa:0xfffe,false);
      this.instructions++;for(let i=0;i<7;i++)this.bus.tick();return 7;
    }
    const oldPc=this.pc,opcode=this.fetch(),d=TABLE[opcode];
    if(!d)throw Error('Unimplemented 6502 opcode $'+opcode.toString(16).padStart(2,'0')+' at $'+oldPc.toString(16));
    if(this.stopOnBrk&&opcode===0x00){
      this.halted=true;this.instructions++;
      for(let i=0;i<7;i++)this.bus.tick();return 7; // explicit demo-only harness stop
    }
    const {name,mode}=d;let cycles=d.cycles;
    if(name==='BRK'){
      this.fetch();this.interrupt(0xfffe,true);
    }else if(name==='RTI'){
      this.p=(this.pull()|U)&~B;
      this.pc=this.pull()|(this.pull()<<8);
    }else if(name==='RTS'){
      this.pc=((this.pull()|(this.pull()<<8))+1)&0xffff;
    }else if(name==='JSR'){
      const target=this.abs(),ret=(this.pc-1)&0xffff;
      this.push(ret>>8);this.push(ret&255);this.pc=target;
    }else if(name==='JMP'){
      this.pc=this.address(mode).addr;
    }else if(name==='PHA')this.push(this.a);
    else if(name==='PHP')this.push(this.p|B|U);
    else if(name==='PLA'){this.a=this.pull();this.setZN(this.a);}
    else if(name==='PLP'){this.p=(this.pull()|U)&~B;}
    else if(name==='CLC')this.setFlag(C,false);
    else if(name==='SEC')this.setFlag(C,true);
    else if(name==='CLI')this.setFlag(I,false);
    else if(name==='SEI')this.setFlag(I,true);
    else if(name==='CLD')this.setFlag(D,false);
    else if(name==='SED')this.setFlag(D,true);
    else if(name==='CLV')this.setFlag(V,false);
    else if(name==='NOP'){}
    else if(name.startsWith('B')&&mode==='rel'){
      const offset=this.fetch(),condition={BPL:!this.flag(N),BMI:this.flag(N),
        BVC:!this.flag(V),BVS:this.flag(V),BCC:!this.flag(C),BCS:this.flag(C),
        BNE:!this.flag(Z),BEQ:this.flag(Z)}[name];
      if(condition){const old=this.pc;this.pc=(this.pc+(offset<128?offset:offset-256))&0xffff;
        cycles++;if((old&0xff00)!==(this.pc&0xff00))cycles++;}
    }else if(['INX','INY','DEX','DEY','TAX','TXA','TAY','TYA','TSX','TXS'].includes(name)){
      switch(name){
        case 'INX':this.x=(this.x+1)&255;break; case 'INY':this.y=(this.y+1)&255;break;
        case 'DEX':this.x=(this.x-1)&255;break;case 'DEY':this.y=(this.y-1)&255;break;
        case 'TAX':this.x=this.a;break;case 'TXA':this.a=this.x;break;
        case 'TAY':this.y=this.a;break;case 'TYA':this.a=this.y;break;
        case 'TSX':this.x=this.sp;break;case 'TXS':this.sp=this.x;break;
      }
      if(name!=='TXS'){
        const field=({INX:'x',INY:'y',DEX:'x',DEY:'y',TAX:'x',TXA:'a',TAY:'y',TYA:'a',TSX:'x'})[name];
        this.setZN(this[field]);
      }
    }else{
      const location=this.address(mode);
      if(d.page&&location.crossed)cycles++;
      // Stores have a write destination; do not trigger a synthetic I/O read first.
      const storing=name==='STA'||name==='STX'||name==='STY';
      let value=storing?undefined:(location.value??this.bus.read(location.addr));
      switch(name){
        case 'LDA':this.a=value;this.setZN(this.a);break;
        case 'LDX':this.x=value;this.setZN(this.x);break;
        case 'LDY':this.y=value;this.setZN(this.y);break;
        case 'STA':this.bus.write(location.addr,this.a);break;
        case 'STX':this.bus.write(location.addr,this.x);break;
        case 'STY':this.bus.write(location.addr,this.y);break;
        case 'ORA':this.a|=value;this.setZN(this.a);break;
        case 'AND':this.a&=value;this.setZN(this.a);break;
        case 'EOR':this.a^=value;this.setZN(this.a);break;
        case 'ADC':this.adc(value);break;
        case 'SBC':this.sbc(value);break;
        case 'CMP':this.compare(this.a,value);break;
        case 'CPX':this.compare(this.x,value);break;
        case 'CPY':this.compare(this.y,value);break;
        case 'BIT':this.setFlag(Z,(this.a&value)===0);this.setFlag(N,!!(value&128));this.setFlag(V,!!(value&64));break;
        case 'ASL':this.setFlag(C,!!(value&128));value=(value<<1)&255;this.setZN(value);break;
        case 'LSR':this.setFlag(C,!!(value&1));value=value>>>1;this.setZN(value);break;
        case 'ROL':{const carry=this.flag(C)?1:0;this.setFlag(C,!!(value&128));value=((value<<1)|carry)&255;this.setZN(value);break;}
        case 'ROR':{const carry=this.flag(C)?128:0;this.setFlag(C,!!(value&1));value=(value>>>1)|carry;this.setZN(value);break;}
        case 'INC':value=(value+1)&255;this.setZN(value);break;
        case 'DEC':value=(value-1)&255;this.setZN(value);break;
        default:throw Error('Unimplemented 6502 instruction '+name);
      }
      if(['ASL','LSR','ROL','ROR','INC','DEC'].includes(name)){
        if(mode==='acc')this.a=value;
        else this.bus.write(location.addr,value);
      }
    }
    this.instructions++;for(let i=0;i<cycles;i++)this.bus.tick();return cycles;
  }
  run(limit=10000,{stopOnBrk=false}={}){
    if(!Number.isSafeInteger(limit)||limit<0||limit>10_000_000)throw RangeError('Invalid instruction limit');
    const original=this.stopOnBrk;this.stopOnBrk=!!stopOnBrk;
    let steps=0;
    try{while(!this.halted&&steps<limit){this.step();steps++;}}
    finally{this.stopOnBrk=original;}
    return {steps,halted:this.halted,pc:this.pc,cycles:this.bus.cycles};
  }
}