/* StarCoin-only Cloudflare -> private GitHub evidence.
 * GitHub never authorizes minting, spending, wallet linking or Robot Brain.
 * No SIM, IMEI, phone number, device credential, email, prompts or chat logs.
 */
const encoder=new TextEncoder();
const sha=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(data))),n=>n.toString(16).padStart(2,'0')).join('');
const numeric=value=>Number.isFinite(Number(value))?Number(value):NaN;
const field=(x,n=160)=>String(x??'').slice(0,n);
const receiptFields=event=>({
  id:field(event.id,150),type:field(event.type,60),
  amount:numeric(event.amount),balance:numeric(event.balance),
  referenceId:field(event.referenceId,150),time:numeric(event.ts)
});
export async function cloudStarCoinBackup(userId,wallet,star){
  if(!userId||wallet?.user?.id!==userId||!wallet?.user?.username
    ||String(wallet.user.username).toLowerCase()!==String(star?.username||'').toLowerCase())
    throw Error('starcoin_account_identity_mismatch');
  if(!Number.isInteger(Number(star.starCoins))||!Number.isInteger(Number(star.pendingShareCredits))
    ||Number(star.pendingShareCredits)<0||Number(star.pendingShareCredits)>9)throw Error('starcoin_state_invalid');
  const units=Math.round((Number(star.starCoins)*10)+Number(star.pendingShareCredits));
  if(units<0||Math.abs(numeric(wallet.balances?.STARCOIN)*10-units)>0.001)
    throw Error('starcoin_sources_disagree');
  const receipts=(Array.isArray(star.ledger)?star.ledger:[]).slice(0,500)
    .map(receiptFields).filter(x=>x.id&&Number.isFinite(x.amount)&&Number.isFinite(x.balance)&&Number.isFinite(x.time));
  const ids=new Set();for(const r of receipts){if(ids.has(r.id))throw Error('starcoin_duplicate_receipt');ids.add(r.id);}
  receipts.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id));
  const accountRef=(await sha('infinity-starcoin-account-v1:'+userId)).slice(0,32);
  const data={schema:'infinity-starcoin-backup-v1',accountRef,
    balanceTenths:units,shareCount:Number(star.shareCount)||0,receipts};
  const hash=await sha(JSON.stringify(data));
  return {data,hash};
}
export function compareStarCoinBackup(previous,current){
  if(!previous)return {status:'new_backup'};
  if(previous.schema!=='infinity-starcoin-backup-v1'||previous.accountRef!==current.accountRef)
    throw Error('backup_account_mismatch_review_required');
  if(!Array.isArray(previous.receipts))throw Error('backup_malformed_review_required');
  const now=new Map(current.receipts.map(x=>[x.id,JSON.stringify(x)]));
  for(const old of previous.receipts){
    if(old?.id&&now.has(old.id)&&JSON.stringify(old)!==now.get(old.id))
      throw Error('backup_mismatch_review_required');
  }
  return {status:'consistent_receipts'};
}
const decode=text=>{
  const raw=atob(String(text||'').replace(/\s/g,''));
  return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));
};
const encode=text=>{
  const bytes=encoder.encode(text);
  let parts=[];for(let i=0;i<bytes.length;i+=8192)parts.push(String.fromCharCode(...bytes.subarray(i,i+8192)));
  return btoa(parts.join(''));
};
const isRepo=x=>/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(x||'')&&!x.includes('..');
export async function githubStarCoinBackup({token,repository,snapshot,mode='write',request=fetch}){
  if(!isRepo(repository)||!/^[-a-f0-9]{64}$/.test(snapshot?.hash||''))throw Error('backup_invalid_request');
  if(!['write','verify'].includes(mode))throw Error('backup_invalid_request');
  const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Bubbles-StarCoin-Backup'};
  const base='https://api.github.com/repos/'+repository;
  const api=async(path,options={})=>{
    const res=await request(base+path,{headers:{...headers,...(options.body?{'Content-Type':'application/json'}:{})},
      method:options.method||'GET',body:options.body?JSON.stringify(options.body):undefined,
      redirect:'error',signal:AbortSignal.timeout(15000)});
    if(res.status===404)return null;
    if(res.status===409||res.status===412||res.status===422)throw Error('backup_commit_conflict_retry');
    if(!res.ok)throw Error('github_backup_http_'+res.status);
    return res.json();
  };
  const repo=await api('');
  if(!repo?.private||repo.full_name!==repository||repo.permissions?.push!==true)
    throw Error('github_private_write_not_verified');
  const path='/contents/starcoins/latest.json';
  const prior=await api(path);
  let previous=null;
  if(prior){
    if(prior.type!=='file'||!prior.sha||!prior.content||prior.size>250000)
      throw Error('backup_malformed_review_required');
    try {previous=JSON.parse(decode(prior.content));}
    catch {throw Error('backup_malformed_review_required');}
  }
  // A GitHub author can edit a JSON file or even rewrite branch history.
  // A matching text hash is not evidence unless it matches the file's data.
  if(previous){
    if(!/^[a-f0-9]{64}$/.test(previous.hash||'')||
       await sha(JSON.stringify(previous.data))!==previous.hash)
       throw Error('backup_mismatch_review_required');
  }
  const consistency=compareStarCoinBackup(previous?.data||null,snapshot.data);
  if(mode==='verify')return {status:previous?.hash===snapshot.hash?'matched':previous?'cloud_advanced_review_needed':'backup_missing',
    consistency:consistency.status,repository,cloudHash:snapshot.hash,githubHash:previous?.hash||null};
  if(previous?.hash===snapshot.hash)return {status:'already_backed_up',repository,hash:snapshot.hash};
  const receiptPath='/contents/starcoins/receipts/'+snapshot.hash+'.json';
  const receipt=await api(receiptPath);
  const record={hash:snapshot.hash,previousHash:previous?.hash||null,data:snapshot.data};
  const body=JSON.stringify(record,null,2)+'\n';
  if(receipt){
    if(!receipt.content||decode(receipt.content)!==body)throw Error('backup_mismatch_review_required');
  } else {
    const saved=await api(receiptPath,{method:'PUT',body:{message:'StarCoin: preserve Cloudflare receipt '+snapshot.hash.slice(0,12),content:encode(body)}});
    if(!/^[a-f0-9]{40}$/.test(saved?.commit?.sha||''))throw Error('backup_commit_unverified');
  }
  const manifest=await api(path,{method:'PUT',body:{message:'StarCoin: advance Cloudflare wallet mirror '+snapshot.hash.slice(0,12),
    ...(prior?.sha?{sha:prior.sha}:{}),content:encode(body)}});
  if(!/^[a-f0-9]{40}$/.test(manifest?.commit?.sha||''))throw Error('backup_commit_unverified');
  // This HTML can be saved and opened offline. It is only a viewer; it is
  // never an authentication token or a source for credits.
  if(!prior){
    const viewerPath='/contents/starcoins/wallet.html';
    if(!await api(viewerPath)){
      const viewer='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        +'<title>Infinity StarCoin Backup Viewer</title><style>body{font:16px system-ui;max-width:600px;margin:2rem auto;padding:1rem;background:#faf7fe;color:#301e49}'
        +'main{background:white;padding:1.5rem;border-radius:16px;border:1px solid #ddd}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style>'
        +'<main><h1>Infinity StarCoin Backup</h1><p>Open your latest.json backup file here. This read-only viewer cannot sign in, link a wallet, transfer, or mint credits.</p>'
        +'<input id="file" type="file" accept=".json,application/json"><pre id="out">Choose latest.json from the private repository.</pre>'
        +'<script>document.getElementById("file").addEventListener("change",async e=>{const out=document.getElementById("out");'
        +'try{const r=JSON.parse(await e.target.files[0].text());if(r.data?.schema!=="infinity-starcoin-backup-v1")throw Error("Invalid format");'
        +'out.textContent="StarCoins: "+(r.data.balanceTenths/10)+"\nReceipts in this file: "+r.data.receipts.length'
        +'+"\nSHA-256 claim: "+r.hash+"\nLocal copy only; verify against live Cloudflare before relying on this data.";'
        +'}catch{out.textContent="Could not read a StarCoin backup JSON file."}});</script></main></html>';
      const created=await api(viewerPath,{method:'PUT',
        body:{message:'Add private offline StarCoin wallet HTML viewer',content:encode(viewer)}});
      if(!/^[a-f0-9]{40}$/.test(created?.commit?.sha||''))throw Error('backup_commit_unverified');
    }
  }
  return {status:'committed',hash:snapshot.hash,repository,
    commit:manifest.commit.sha,url:'https://github.com/'+repository+'/commit/'+manifest.commit.sha,
    chain:previous?.hash||null};
}
