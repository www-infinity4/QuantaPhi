import {createHash} from 'node:crypto';

export const INTENTS=Object.freeze(['website','app','repair','test','integration','data','other']);
export const BUILDERS=Object.freeze(['human','bubbles','gpt','copilot','other-ai']);
const CODE_EXT=/\.(?:js|cjs|mjs|jsx|ts|tsx|py|go|rs|java|kt|swift|c|cc|cpp|h|hpp|rb|php|sh|bash|html|css|scss|sql|vue|svelte)$/i;
const SKIP_PATH=/(^|\/)(?:node_modules|vendor|dist|build|coverage|\.next|\.git|generated|fixtures|__snapshots__|secrets|keys)(\/|$)|(?:^|\/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|.*\.min\.(?:js|css)|.*\.map)$/i;
const SECRET_PATH=/(^|\/)(?:\.env(?:\..*)?|id_rsa|id_ed25519|.*\.(?:pem|p12|key)|credentials(?:\..*)?)(?:$|\/)/i;
export const sha256=text=>createHash('sha256').update(text,'utf8').digest('hex');
const validateSource=source=>{
 if(!source||!(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/).test(source.repo||'')||source.repo.split('/').some(x=>x==='.'||x==='..'||x.startsWith('.')))throw new Error('invalid_repo');
 if(!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/i.test(source.commit||''))throw new Error('invalid_commit');
 if(!INTENTS.includes(source.intent))throw new Error('invalid_intent');
 if(!BUILDERS.includes(source.builderClaim))throw new Error('invalid_builder');
 if(source.githubLoginClaim&&!/^[A-Za-z0-9-]{1,39}$/.test(source.githubLoginClaim))throw new Error('invalid_login');
};

export function classifyLine(content,path){
 if(SECRET_PATH.test(path))return {eligible:false,reason:'sensitive_path'};
 if(SKIP_PATH.test(path))return {eligible:false,reason:'generated_or_vendor'};
 if(!CODE_EXT.test(path))return {eligible:false,reason:'non_code_file'};
 const clean=content.trim();
 if(!clean)return {eligible:false,reason:'blank_line'};
 // An HTML closing tag is a real structural code line even when short.
 // Record it as a candidate; CI and Quant AI still reject invalid filler.
 if(/\.html?$/i.test(path)&&/^<\/[A-Za-z][A-Za-z0-9:-]*\s*>$/.test(clean))return {eligible:true,reason:null};
 if(/^(?:\/\/|\/\*|\*|#|<!--|--(?:\s|$))/.test(clean))return {eligible:false,reason:'comment_only'};
 if(clean.length<8||/^[{}()[\];,]+$/.test(clean))return {eligible:false,reason:'trivial_line'};
 if(/^(.)\1{16,}$/.test(clean)||/(\b(?:lorem|foobar|placeholder|filler)\b.*){3,}/i.test(clean))return {eligible:false,reason:'repetitive_filler'};
 if(clean.length>600)return {eligible:false,reason:'oversized_line'};
 return {eligible:true,reason:null};
}

export function buildManifest(diff,source){
 validateSource(source);
 if(typeof diff!=='string'||diff.length>3_000_000)throw new Error('invalid_diff');
 const records=[];const seen=new Set();let path=null,lineNumber=0,inHunk=false,hunks=0;
 for(const line of diff.split('\n')){
  if(line.startsWith('diff --git ')){path=null;inHunk=false;continue;}
  if(!inHunk&&line.startsWith('+++ ')){
   const name=line.slice(4);
   path=name.startsWith('b/')?name.slice(2):null;
   continue;
  }
  const hunk=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
  if(hunk){lineNumber=Number(hunk[1]);inHunk=true;hunks++;continue;}
  if(!inHunk||!path)continue;
  if(line.startsWith('\\ No newline'))continue;
  if(line.startsWith('+')){
   const raw=line.slice(1).replace(/\r$/,'');
   const hash=sha256(raw);
   const kind=classifyLine(raw,path);
   const signature=path+'\0'+hash;
   // Common structural HTML tags repeat legitimately at different line numbers.
   // Their provenance IDs remain unique; later verification rejects tag spam.
   const structuralHtml=/\.html?$/i.test(path)&&/^<\/[A-Za-z][A-Za-z0-9:-]*\s*>$/.test(raw.trim());
   const unique=structuralHtml||!seen.has(signature);
   seen.add(signature);
   const eligible=kind.eligible&&unique;
   const receipt={
    id:sha256(JSON.stringify(['git-line-v1',source.repo,source.commit,path,lineNumber,hash])),
    path,line_number:lineNumber,content_sha256:hash,
    git_type:'git:'+source.intent,
    language:path.split('.').at(-1).toLowerCase(),
    eligible,reason:kind.eligible&&!unique?'duplicate_in_commit':kind.reason
   };
   records.push(receipt);lineNumber++;
  }else if(line.startsWith(' '))lineNumber++;
  else if(!line.startsWith('-')){inHunk=false;}
  if(records.length>10000)throw new Error('diff_too_large');
 }
 if(!hunks||!records.length)throw new Error('no_added_lines');
 const eligible=records.filter(x=>x.eligible).length;
 return {
  version:1,currency:'GIT',status:'provisional_not_minted',
  repo:source.repo,commit:source.commit.toLowerCase(),intent:source.intent,
  builder_claim:source.builderClaim,github_login_claim:source.githubLoginClaim||null,
  summary:{added:records.length,eligible,excluded:records.length-eligible},
  lines:records
 };
}
