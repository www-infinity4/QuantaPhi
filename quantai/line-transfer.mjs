/* Quant AI one-line source transfer boundary (server-only).
 * A valid server-issued grant authorizes ONE line, not the whole file.
 * Neither this module nor its grants award GIT/GPT/Bubble Bits or mutate wallets.
 * Callers must obtain source from an immutable, verified commit on the server.
 */
import {createHmac, timingSafeEqual} from 'node:crypto';

const invalid=()=>{throw new Error('invalid line grant request')};
const denied=()=>{throw new Error('line transfer not authorized')};
const validLine=line=>Number.isSafeInteger(line)&&line>0;
const validText=(v,max=200)=>typeof v==='string'&&v.length>0&&v.length<=max;
const b64=s=>Buffer.from(s,'utf8').toString('base64url');
const mac=(payload,secret)=>createHmac('sha256',secret).update(payload).digest('base64url');

function checkScope({repository,commit,path,line,recipient,expiresAt}){
 if(!validText(repository,160)||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))invalid();
 if(!validText(commit,64)||!(/^[a-fA-F0-9]{40}$/.test(commit)||/^[a-fA-F0-9]{64}$/.test(commit)))invalid();
 if(!validText(path,500)||path.startsWith('/')||path.split('/').some(x=>!x||x==='.'||x==='..'))invalid();
 if(!validLine(line)||!validText(recipient,200)||!Number.isSafeInteger(expiresAt)||expiresAt<=0)invalid();
}
function checkSecret(secret){
 if(typeof secret!=='string'||secret.length<32)invalid();
}

// Issue this on the authenticated backend AFTER checking the recipient may
// receive the requested line. Never give a browser/client the signing secret.
export function issueLineGrant({repository,commit,path,line,recipient,expiresAt,secret}){
 checkSecret(secret);checkScope({repository,commit,path,line,recipient,expiresAt});
 const body=b64(JSON.stringify({v:1,repository,commit,path,line,recipient,expiresAt}));
 return `${body}.${mac(body,secret)}`;
}

// Export exactly the line authorized for this recipient, immutable commit and
// path. The return value is a plain single-line string with NO neighbor lines,
// full-file payload, source map, or additional metadata.
export function exportPermittedLine({source,repository,commit,path,line,recipient,grant,secret,now=Date.now()}){
 checkSecret(secret);
 if(!validLine(line)||!Number.isSafeInteger(now)||typeof source!=='string')invalid();
 if(typeof grant!=='string'||grant.length>2048)denied();
 const parts=grant.split('.');if(parts.length!==2||!parts[0]||!parts[1])denied();
 const expected=mac(parts[0],secret);
 const actual=Buffer.from(parts[1],'utf8');
 const correct=Buffer.from(expected,'utf8');
 if(actual.length!==correct.length||!timingSafeEqual(actual,correct))denied();
 let payload;
 try{payload=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'))}catch{denied()}
 if(!payload||payload.v!==1||payload.repository!==repository||payload.commit!==commit||
    payload.path!==path||payload.line!==line||payload.recipient!==recipient||
    !Number.isSafeInteger(payload.expiresAt)||now>=payload.expiresAt)denied();
 // The source file is held on the trusted server, never passed to the recipient.
 const lines=source.split(/\r\n|\n|\r/);
 if(line>lines.length)throw new Error('requested source line not available');
 return lines[line-1];
}
