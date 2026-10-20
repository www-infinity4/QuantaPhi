/* Private, user-selected Bubbles/ChatGPT archive reader. No network requests.
   ZIP entries are bounded before and during decompression; never execute imports. */
const encoder=new TextEncoder();
const decoder=new TextDecoder('utf-8',{fatal:true});
const u16=(view,n)=>view.getUint16(n,true);
const u32=(view,n)=>view.getUint32(n,true);
const MAX_ZIP=80*1024*1024;
const MAX_TEXT=40*1024*1024;
const SID=/^chat_[a-f0-9]{32}$/;
function check(condition,message){if(!condition)throw Error(message)}
function clean(value,cap=6000){return String(value??'').replace(/\u0000/g,'').trim().slice(0,cap)}
function timestamp(value){
 const n=Number(value);
 const t=Number.isFinite(n)&&n>0?(n<10000000000?n*1000:n):Date.parse(String(value||''));
 return Number.isFinite(t)?Math.max(946684800000,Math.min(Date.now(),Math.round(t))):Date.now();
}
// Table-driven CRC keeps the integrity check responsive on low-memory phones.
const CRC_TABLE=Uint32Array.from({length:256},(_,index)=>{
 let crc=index;
 for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
 return crc>>>0;
});
function crc32(bytes){
 let crc=0xffffffff;
 for(const value of bytes)crc=CRC_TABLE[(crc^value)&255]^(crc>>>8);
 return (crc^0xffffffff)>>>0;
}
function records(role,text,at,id){
 if(!['user','assistant'].includes(role)||typeof text!=='string')return [];
 // A single ChatGPT response can exceed the existing D1 6000-character
 // message bound. Preserve ALL of its text in deterministic continuation
 // records instead of silently truncating the source conversation.
 const value=text.replace(/\u0000/g,'').trim();
 if(!value)return [];
 const chunks=[];
 for(let start=0;start<value.length;start+=5500){
  const part=chunks.length;
  chunks.push({role,text:value.slice(start,start+5500),at:timestamp(at),
   id:clean(id,80)+(value.length>5500?'_part'+part:'')});
 }
 return chunks;
}
export function parseConversations(json){
 const input=Array.isArray(json)?json:Array.isArray(json?.conversations)?json.conversations:null;
 check(Array.isArray(input),'This file does not contain a recognized conversation collection.');
 const source=json?.format==='bubbles-chat-export-v1'?'bubbles':input.some(x=>x?.mapping&&typeof x.mapping==='object')?'chatgpt':'unknown';
 check(source!=='unknown','Expected ChatGPT conversations.json or a Bubbles chat export.');
 const sessions=[];let skippedMessages=0;
 for(const [index,thread] of input.entries()){
  if(!thread||typeof thread!=='object')continue;
  let items=[];
  if(source==='bubbles'){
   items=Array.isArray(thread.messages)?thread.messages.flatMap((m,i)=>records(m.role,m.text,m.at,m.id||'restore_'+i)):[];
  }else{
   const mapping=thread.mapping;
   if(!mapping||typeof mapping!=='object')continue;
   const chain=[],visited=new Set();
   let cursor=thread.current_node;
   while(cursor&&mapping[cursor]&&!visited.has(cursor)&&chain.length<10000){
    visited.add(cursor);chain.push([cursor,mapping[cursor]]);
    cursor=mapping[cursor]?.parent;
   }
   const nodes=chain.length?chain.reverse():Object.entries(mapping).sort((a,b)=>timestamp(a[1]?.message?.create_time)-timestamp(b[1]?.message?.create_time));
   if(cursor&&mapping[cursor]&&chain.length>=10000)throw Error('This conversation has more than 10000 mapped nodes and requires a larger-history reader.');
   items=nodes.flatMap(([id,node])=>{
    const m=node?.message;const parts=m?.content?.parts;
    const value=Array.isArray(parts)?parts.filter(x=>typeof x==='string').join('\n'):m?.content?.text;
    return records(m?.author?.role,value,m?.create_time||thread.create_time,'import_'+String(thread.id||index)+'_'+id);
   });
  }
  if(!items.length)continue;
  // Page conversations through D1 on demand instead of dropping messages
  // after the first 400. Their ordering and original timestamps are retained.
  sessions.push({sourceId:String(thread.id||index),id:source==='bubbles'&&SID.test(thread.id||'')?thread.id:'',
   title:clean(thread.title||'Imported conversation',80),created:timestamp(thread.create_time||thread.created||items[0].at),
   updated:timestamp(thread.update_time||thread.updated||items.at(-1).at),messages:items});
 }
 check(sessions.length>0,'No readable user or assistant text was found in this archive.');
 return {source,sessions,skippedMessages};
}
async function inflateRaw(compressed,maxBytes){
 check(typeof DecompressionStream==='function','ZIP compression requires an updated Chrome or Android System WebView.');
 let stream;
 try{stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'))}
 catch{throw Error('This browser cannot decode deflated ZIP files. Update Chrome or Android System WebView.');}
 const reader=stream.getReader(),chunks=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel();throw Error('ZIP content exceeds the safe import size.');}
   chunks.push(value);
  }
 }finally{try{reader.releaseLock()}catch{}}
 const result=new Uint8Array(size);let p=0;for(const chunk of chunks){result.set(chunk,p);p+=chunk.length;}
 return result;
}
export async function readZip(file,selector){
 check(file.size<=MAX_ZIP,'ZIP exceeds 80 MB; use smaller exports.');
 const buffer=await file.arrayBuffer();
 const view=new DataView(buffer);let end=-1;
 for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){
  if(u32(view,i)===0x06054b50){end=i;break;}
 }
 check(end>=0,'Not a valid ZIP archive.');
 const total=u16(view,end+10),offset=u32(view,end+16);
 check(total<5000&&offset<buffer.byteLength,'Unsupported ZIP index size.');
 let pos=offset;const choices=[];
 for(let index=0;index<total;index++){
  check(pos+46<=buffer.byteLength&&u32(view,pos)===0x02014b50,'Invalid ZIP central directory.');
  const flag=u16(view,pos+8),method=u16(view,pos+10),checksum=u32(view,pos+16),compressed=u32(view,pos+20),unpacked=u32(view,pos+24);
  const nameLen=u16(view,pos+28),extra=u16(view,pos+30),comment=u16(view,pos+32),local=u32(view,pos+42);
  check(compressed!==0xffffffff&&unpacked!==0xffffffff,'ZIP64 archives are not supported.');
  check(pos+46+nameLen+extra+comment<=buffer.byteLength,'Invalid ZIP filename.');
  const name=decoder.decode(new Uint8Array(buffer,pos+46,nameLen));
  check(!name.startsWith('/')&&!name.split('/').some(part=>part==='..'),'Unsafe ZIP entry path.');
  if(!name.endsWith('/')&&selector(name)){
   check(!(flag&1),'Password-protected ZIP archives are not supported.');
   check(method===0||method===8,'ZIP contains an unsupported compression method.');
   check(unpacked<=MAX_TEXT,'ZIP entry is too large to read safely.');
   check(local+30<=buffer.byteLength&&u32(view,local)===0x04034b50,'Invalid ZIP data header.');
   const dataOffset=local+30+u16(view,local+26)+u16(view,local+28);
   check(dataOffset+compressed<=buffer.byteLength,'Truncated ZIP entry.');
   choices.push({name,method,unpacked,checksum,bytes:new Uint8Array(buffer,dataOffset,compressed)});
  }
  pos+=46+nameLen+extra+comment;
 }
 check(choices.length>0,'No supported file was found in this ZIP.');
 check(choices.length===1,'Multiple conversation archives were found. Extract the correct conversations.json and import it directly.');
 const chosen=choices[0];
 const bytes=chosen.method===0?chosen.bytes:await inflateRaw(chosen.bytes,MAX_TEXT);
 check(bytes.length===chosen.unpacked,'ZIP entry size does not match its index.');
 check(crc32(bytes)===chosen.checksum,'ZIP conversation data failed its integrity check. Nothing was imported.');
 return {name:chosen.name,text:decoder.decode(bytes)};
}
export async function readConversationArchive(file){
 check(file&&file.size<=MAX_ZIP,'Choose a ChatGPT or Bubbles export smaller than 80 MB.');
 const isZip=/\.zip$/i.test(file.name||'');
 const source=isZip?await readZip(file,name=>/(^|\/)(conversations|bubbles-chats)\.json$/i.test(name)):
  {name:file.name,text:await file.text()};
 check(source.text.length<=MAX_TEXT,'Conversation JSON is too large to import safely.');
 return {...parseConversations(JSON.parse(source.text)),filename:source.name};
}
export async function readDocument(file){
 check(file&&file.size<=4*1024*1024,'Choose a text, JSON, Markdown, or CSV file smaller than 4 MB.');
 check(/\.(txt|md|markdown|csv|json|log)$/i.test(file.name||''),'This reader supports TXT, Markdown, CSV, JSON, and LOG files. Use the History importer for ZIP chat archives.');
 const text=await file.text();
 check(text.trim().length>0,'The selected file has no readable text.');
 return {name:clean(file.name,100),text:text.slice(0,14000),truncated:text.length>14000};
}
function little(n,count){const b=new Uint8Array(count);for(let i=0;i<count;i++)b[i]=(n>>>(8*i))&255;return b;}
function storedZipEntry(name,data,offset){
 const filename=encoder.encode(name),bytes=encoder.encode(data),crc=crc32(bytes);
 check(bytes.length<MAX_TEXT,'The Bubbles export is too large for a single ZIP.');
 const local=[little(0x04034b50,4),little(20,2),little(0,2),little(0,2),little(0,2),little(0,2),little(crc,4),little(bytes.length,4),little(bytes.length,4),little(filename.length,2),little(0,2),filename,bytes];
 const central=[little(0x02014b50,4),little(20,2),little(20,2),little(0,2),little(0,2),little(0,2),little(0,2),little(crc,4),little(bytes.length,4),little(bytes.length,4),little(filename.length,2),little(0,2),little(0,2),little(0,2),little(0,2),little(0,4),little(offset,4),filename];
 return {local,central,length:30+filename.length+bytes.length};
}
export function makeConversationZip(sessions){
 check(Array.isArray(sessions)&&sessions.length>0,'There are no saved conversations to export.');
 const payload=JSON.stringify({format:'bubbles-chat-export-v1',exported:new Date().toISOString(),conversations:sessions});
 const entry=storedZipEntry('bubbles-chats.json',payload,0);
 const centralSize=entry.central.reduce((n,x)=>n+x.length,0);
 const ending=[little(0x06054b50,4),little(0,2),little(0,2),little(1,2),little(1,2),little(centralSize,4),little(entry.length,4),little(0,2)];
 return new Blob([...entry.local,...entry.central,...ending],{type:'application/zip'});
}
