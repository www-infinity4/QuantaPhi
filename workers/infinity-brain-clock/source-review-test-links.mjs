/* Brain-side validation of test paths from a signed Pink merged-source receipt.
 * No Node filesystem or model trust. Independently read pinned current GitHub
 * test source and demand a static executable reference to a changed source file.
 */
const TEST=/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.(?:test|spec)\.(?:js|mjs|cjs)$/;
const SHA=/^[a-f0-9]{40}$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;

function safeTestPath(value){
 return typeof value==='string'&&TEST.test(value)&&
  value.split('/').every(part=>part!=='.'&&part!=='..'&&!part.startsWith('.'));
}
function normalizeReference(spec,kind,testPath){
 if(typeof spec!=='string'||!spec||spec.includes('\0')||
  spec.includes('\\')||spec.includes('?')||spec.includes('#')||
  spec.startsWith('/')||/^[a-z][a-z0-9+.-]*:/i.test(spec))return null;
 if(kind!=='cwd'&&!spec.startsWith('.'))return null;
 const bits=kind==='cwd'?[]:testPath.split('/').slice(0,-1);
 for(const part of spec.split('/')){
  if(!part||part==='.')continue;
  if(part==='..'){if(!bits.length)return null;bits.pop();continue;}
  if(!/^[A-Za-z0-9_.-]+$/.test(part))return null;
  bits.push(part);
 }
 return bits.length?bits.join('/'):null;
}
function tokenize(source){
 const result=[];let i=0;
 while(i<source.length&&result.length<30000){
  const c=source[i],next=source[i+1];
  if(/\s/.test(c)){i++;continue;}
  if(c==='/'&&next==='/'){i+=2;while(i<source.length&&source[i]!=='\n')i++;continue;}
  if(c==='/'&&next==='*'){
   const end=source.indexOf('*/',i+2);if(end<0)return [];
   i=end+2;continue;
  }
  if(c==='"'||c==="'"){
   let value='',escaped=false,closed=false;const quote=c;i++;
   while(i<source.length){
    const ch=source[i++];
    if(ch==='\\'){escaped=true;if(i<source.length)i++;continue;}
    if(ch===quote){closed=true;break;}
    if(ch==='\n')return [];
    value+=ch;
   }
   if(!closed)return [];
   result.push({type:'str',value,escaped});continue;
  }
  if(c===String.fromCharCode(96)){
   i++;let closed=false;
   while(i<source.length){const ch=source[i++];if(ch==='\\'){i++;continue;}if(ch===String.fromCharCode(96)){closed=true;break;}}
   if(!closed)return [];
   result.push({type:'template'});continue;
  }
  if(c==='/'&&next!=='/'&&next!=='*'){
   const previous=result.at(-1);
   const regexCandidate=!previous||
    previous.type==='sym'&&['=','(',':','[','{',',','!','?',';'].includes(previous.value)||
    previous.type==='id'&&['return','throw','case'].includes(previous.value);
   if(regexCandidate){
    let end=i+1,quoted=false,inClass=false,finished=false;
    for(;end<source.length;end++){
     const ch=source[end];if(ch==='\n')break;
     if(quoted){quoted=false;continue;}if(ch==='\\'){quoted=true;continue;}
     if(ch==='['){inClass=true;continue;}if(ch===']'){inClass=false;continue;}
     if(ch==='/'&&!inClass){finished=true;break;}
    }
    if(finished){i=end+1;while(i<source.length&&/[a-z]/i.test(source[i]))i++;result.push({type:'regex'});continue;}
   }
  }
  if(/[A-Za-z_$]/.test(c)){
   let value=c;i++;
   while(i<source.length&&/[A-Za-z0-9_$]/.test(source[i]))value+=source[i++];
   result.push({type:'id',value});continue;
  }
  result.push({type:'sym',value:c});i++;
 }
 return result;
}
const id=(t,value)=>t?.type==='id'&&t.value===value;
const sym=(t,value)=>t?.type==='sym'&&t.value===value;
const string=t=>t?.type==='str'&&!t.escaped?t.value:null;

export function referenceMatchesChangedSource(source,testPath,changedPaths){
 if(typeof source!=='string'||source.length>250000||!safeTestPath(testPath)||
  !Array.isArray(changedPaths)||changedPaths.length>99)return false;
 const target=new Set(changedPaths);
 const token=tokenize(source);
 const matches=(spec,kind)=>target.has(normalizeReference(spec,kind,testPath));
 for(let i=0;i<token.length;i++){
  if(id(token[i],'import')&&!sym(token[i-1],'.')){
   if(matches(string(token[i+1]),'module'))return true;
   if(sym(token[i+1],'(')&&matches(string(token[i+2]),'module'))return true;
   for(let j=i+1;j<Math.min(i+45,token.length)&&!sym(token[j],';');j++)
    if(id(token[j],'from')&&matches(string(token[j+1]),'module'))return true;
  }
  if(id(token[i],'require')&&sym(token[i+1],'(')&&matches(string(token[i+2]),'module'))return true;
  if(id(token[i],'readFileSync')&&sym(token[i+1],'(')){
   if(matches(string(token[i+2]),'cwd'))return true;
   if(id(token[i+2],'new')&&id(token[i+3],'URL')&&sym(token[i+4],'(')&&
    sym(token[i+6],',')&&id(token[i+7],'import')&&sym(token[i+8],'.')&&
    id(token[i+9],'meta')&&sym(token[i+10],'.')&&id(token[i+11],'url')&&
    matches(string(token[i+5]),'module'))return true;
  }
 }
 return false;
}

export async function verifyPinnedSourceTestLinks({repo,sourceSha,changedPaths,testPaths,github}={}){
 if(!REPO.test(repo||'')||!SHA.test(sourceSha||'')||!Array.isArray(testPaths)||
  testPaths.length<1||testPaths.length>8||
  testPaths.some(x=>!safeTestPath(x))||new Set(testPaths).size!==testPaths.length||
  !Array.isArray(changedPaths)||changedPaths.length<1||changedPaths.length>=100||
  !changedPaths.every(x=>typeof x==='string'&&!x.startsWith('/')&&!x.split('/').includes('..'))||
  typeof github!=='function')return false;
 for(const path of testPaths){
  if(changedPaths.includes(path))continue; // Existing exact-PR guard is preserved.
  let body;
  try{
   const target='repos/'+repo+'/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+sourceSha;
   body=await github(target);
  }catch{return false;}
  if(body?.type!=='file'||body.encoding!=='base64'||typeof body.content!=='string'||
   body.content.length>355000||Number(body.size||0)>250000)return false;
  let source;
  try{source=atob(body.content.replace(/\s+/g,''));}catch{return false;}
  if(source.length>250000||!referenceMatchesChangedSource(source,path,changedPaths.filter(x=>!safeTestPath(x))))return false;
 }
 return true;
}
