/* Disk II slot-6 SOFTWARE controller, byte-level NIB prototype.
 * User-authorized .nib input only; no Apple ROM, copyrighted disk, GCR
 * encoder, flux timing, 13-sector or DSK conversion is bundled.
 * Q6/Q7 transitions are modeled, not a cycle-accurate LSS.
 */
export const DISK2_BASE=0xC0E0;
export const DISK2_ROM_BASE=0xC600;
export const NIB_TRACK_BYTES=6656;
export const NIB_TRACKS=35;
const NIB_SIZE=NIB_TRACK_BYTES*NIB_TRACKS;
function driveIndex(index){
  if(!Number.isInteger(index)||index<0||index>1)throw RangeError('Disk II drive must be 0 or 1');
  return index;
}
function newDrive(){return {image:null,writeProtected:true,halfTrack:0,position:0};}
export class VirtualDisk2 {
  constructor(){
    this.drives=[newDrive(),newDrive()];this.selected=0;
    this.motorOn=false;this.phases=0;this.q6=false;this.q7=false;
    this.latch=0;this.readCount=0;this.writeCount=0;
    this.bootROM=new Uint8Array(256);this.bootROMLoaded=false;
  }
  mount(index,data,{writeProtected=true}={}){
    driveIndex(index);
    if(!(data instanceof Uint8Array)||data.length!==NIB_SIZE)
      throw RangeError('NIB image must be exactly 35 x 6656 bytes (232960 bytes)');
    const d=this.drives[index];
    d.image=Uint8Array.from(data);d.writeProtected=!!writeProtected;
    d.halfTrack=0;d.position=0;
  }
  eject(index){
    const d=this.drives[driveIndex(index)];d.image=null;d.writeProtected=true;d.position=0;
  }
  exportImage(index){
    const d=this.drives[driveIndex(index)];
    if(!d.image)throw Error('No disk image mounted');
    return Uint8Array.from(d.image);
  }
  loadBootROM(data){
    if(!(data instanceof Uint8Array)||data.length!==256)
      throw RangeError('Disk II slot ROM must be exactly 256 bytes, supplied by user');
    this.bootROM.set(data);this.bootROMLoaded=true;
  }
  readBootROM(address){
    if(!Number.isInteger(address)||address<DISK2_ROM_BASE||address>=DISK2_ROM_BASE+256)
      throw RangeError('Slot 6 ROM address must be $C600-$C6FF');
    return this.bootROM[address-DISK2_ROM_BASE];
  }
  stepPhase(offset){
    const phase=offset>>1,bit=1<<phase,old=this.phases;
    if(offset&1){this.phases|=bit;return;}
    this.phases&=~bit;
    if(!(old&bit))return;
    const next=(phase+1)&3,prev=(phase+3)&3;
    const inward=!!(this.phases&(1<<next)),outward=!!(this.phases&(1<<prev));
    if(inward!==outward){
      const d=this.drives[this.selected];
      d.halfTrack=Math.max(0,Math.min(2*NIB_TRACKS-1,d.halfTrack+(inward?1:-1)));
      d.position=0;
    }
  }
  imageOffset(d){return Math.floor(d.halfTrack/2)*NIB_TRACK_BYTES+d.position;}
  readNibble(){
    const d=this.drives[this.selected];
    if(!this.motorOn||!d.image)return 0;
    const result=d.image[this.imageOffset(d)];
    d.position=(d.position+1)%NIB_TRACK_BYTES;
    this.readCount++;
    return result;
  }
  writeNibble(){
    const d=this.drives[this.selected];
    if(!this.motorOn||!d.image||d.writeProtected)return;
    d.image[this.imageOffset(d)]=this.latch;
    d.position=(d.position+1)%NIB_TRACK_BYTES;
    this.writeCount++;
  }
  // C0E0-C0EF are read/write soft-switches; byte transfers are
  // intentionally simplified to C0EC pending proper flux/LSS emulation.
  access(offset,value=0,isWrite=false){
    if(!Number.isInteger(offset)||offset<0||offset>=16)throw RangeError('Invalid Disk II soft switch');
    if(offset<8)this.stepPhase(offset);
    else if(offset===8)this.motorOn=false;
    else if(offset===9)this.motorOn=true;
    else if(offset===10)this.selected=0;
    else if(offset===11)this.selected=1;
    else if(offset===12)this.q6=false;
    else if(offset===13)this.q6=true;
    else if(offset===14)this.q7=false;
    else this.q7=true;
    const d=this.drives[this.selected];
    if(this.q7&&this.q6){if(isWrite)this.latch=value&255;return this.latch;}
    if(this.q7&&!this.q6){if(offset===12&&isWrite)this.writeNibble();return this.latch;}
    if(!this.q7&&this.q6)return !d.image||d.writeProtected?0x80:0;
    if(offset===12&&!isWrite)return this.readNibble();
    return 0;
  }
  snapshot(){return {
    motorOn:this.motorOn,selectedDrive:this.selected+1,
    q6:this.q6,q7:this.q7,readCount:this.readCount,writeCount:this.writeCount,
    slotROMLoaded:this.bootROMLoaded,
    drives:this.drives.map(d=>({mounted:!!d.image,writeProtected:d.writeProtected,
      halfTrack:d.halfTrack,track:Math.floor(d.halfTrack/2),position:d.position}))
  };}
}
