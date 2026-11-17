/* QuantaPhi original deterministic SVG image print engine.
 * Open-source repositories in the accompanying catalog are references ONLY.
 * Never load or execute third-party code, access a paid API or treat a repo as
 * permission to copy its styles and source artwork.
 */
const MODES=new Set(['gradient','pattern','sketch','poster','avatar','mandala']);
const LICENSES=new Set(['MIT','LGPL-2.1']);
const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const bounded=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,150);
const hs=(h,s,l)=>'hsl('+Math.round((h+360)%360)+' '+s+'% '+l+'%)';
function seedHash(text){
 let value=2166136261;for(const char of text){value^=char.codePointAt(0);value=Math.imul(value,16777619)}
 return value>>>0;
}
function rng(seed){
 let state=seed||1;
 return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
}
export function parseGitHubSource(value){
 if(typeof value!=='string'||!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value))throw Error('Invalid GitHub source URL');
 const url=new URL(value);
 if(url.hostname!=='github.com'||url.username||url.password||url.port||url.search||url.hash)throw Error('Invalid GitHub source URL');
 return url.pathname.slice(1);
}
export function normalizeGeneratorSources(rows){
 if(!Array.isArray(rows))throw Error('Image source database must be an array');
 const seen=new Set(),modes=new Set();
 return rows.map((input)=>{
  const row={...input};
  if(typeof row.id!=='string'||!/^image-[a-z0-9-]{5,45}$/.test(row.id))throw Error('Invalid generator id');
  if(seen.has(row.id))throw Error('Duplicate generator id: '+row.id);
  seen.add(row.id);
  if(!MODES.has(row.mode)||modes.has(row.mode))throw Error('Unsupported or duplicate generator mode');
  modes.add(row.mode);
  if(row.implementation!=='original-local-svg'||row.sourceUsage!=='reference-only')throw Error('Invalid implementation or source rights');
  if(!LICENSES.has(row.sourceLicense))throw Error('Unreviewed source license');
  if(parseGitHubSource(row.sourceUrl)!==row.sourceRepo)throw Error('Unmatched source repository');
  const website=new URL(String(row.websiteUrl||''));
  if(website.protocol!=='https:'||website.username||website.password||!website.hostname.includes('.')||website.hostname==='localhost')throw Error('Invalid source website');
  for(const key of ['title','tagline','examplePrompt','rightsNote']){
   if(typeof row[key]!=='string'||row[key].trim().length<6||row[key].length>300)throw Error('Invalid '+key);
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.sourceCheckedAt||''))throw Error('Source check date missing');
  return Object.freeze(row);
 });
}
export function nextGeneratorIndex(index,step,count){
 if(!Number.isInteger(count)||count<=0)return 0;
 return (((Number.isInteger(index)?index:0)+(step<0?-1:1))%count+count)%count;
}
function svgShell(mode,prompt,body,hue){
 const title=mode==='avatar'?'Original avatar':'Original '+mode+' artwork';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" width="960" height="640" role="img" aria-label="'+xml(title)+'"><title>'+xml(title)+'</title><desc>'+xml(prompt||'New original '+mode+' graphic')+'</desc>'+
 '<rect width="960" height="640" fill="'+hs(hue,43,12)+'"/>'+body+
 '<text x="930" y="614" text-anchor="end" fill="#ffffff" opacity=".58" font-family="system-ui,sans-serif" font-size="15" letter-spacing="2">INFINITY® · ORIGINAL</text></svg>';
}
export function generateImageSvg({mode,prompt='',variation=0}={}){
 if(!MODES.has(mode))throw Error('Unsupported image generator mode');
 const text=bounded(prompt),salt=Number.isInteger(variation)?Math.max(0,Math.min(9999,variation)):0;
 const hash=seedHash(mode+'|'+text+'|'+salt),random=rng(hash),hue=hash%360;
 const pick=(off,s=65,l=54)=>hs((hue+off+random()*36)%360,s,l);
 let body='';
 if(mode==='gradient'){
  body='<defs><linearGradient id="aurora" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+pick(0,70,26)+'"/><stop offset=".55" stop-color="'+pick(75,75,30)+'"/><stop offset="1" stop-color="'+pick(185,70,16)+'"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="44"/></filter></defs>'+
   '<rect width="960" height="640" fill="url(#aurora)"/><g filter="url(#soft)" opacity=".86">';
  for(let i=0;i<11;i++){const x=Math.round(random()*1020-30),y=Math.round(random()*700-30),rx=Math.round(90+random()*210),ry=Math.round(60+random()*180);
   body+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+pick(i*31,75,58)+'"/>'}
  body+='</g><path d="M0 500 Q290 390 540 520 T960 440 L960 640 L0 640Z" fill="#100c23" opacity=".35"/>';
 }else if(mode==='pattern'){
  body='<rect width="960" height="640" fill="'+pick(30,50,18)+'"/>';
  for(let y=0;y<8;y++)for(let x=0;x<12;x++){
   const cx=42+x*80,cy=40+y*80,size=15+Math.round(random()*20);
   body+='<g transform="translate('+cx+' '+cy+') rotate('+Math.round(random()*180)+')">'+
    '<rect x="-'+size+'" y="-'+size+'" width="'+(size*2)+'" height="'+(size*2)+'" rx="'+Math.round(size/4)+'" fill="'+pick((x+y)*19,68,55)+'" opacity=".79"/>'+
    '<circle r="'+Math.round(size/2)+'" fill="'+pick(175,52,20)+'" opacity=".9"/></g>';
  }
 }else if(mode==='sketch'){
  body='<rect width="960" height="640" fill="#f3eddf"/>';
  for(let i=0;i<20;i++){
   const y=45+i*31,move=Math.round(random()*72-36),end=Math.round(random()*100-50);
   body+='<path d="M-30 '+(y+move)+' C'+Math.round(220+random()*140)+' '+Math.round(y-190+random()*200)+' 600 '+Math.round(y+random()*130-65)+' 1000 '+(y+end)+'" fill="none" stroke="'+pick(i*12,57,37)+'" stroke-width="'+(2+Math.round(random()*5))+'" stroke-linecap="round" opacity=".82"/>';
  }
  for(let i=0;i<14;i++){const x=Math.round(random()*960),y=Math.round(random()*570),r=Math.round(5+random()*23);
   body+='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+pick(i*15,55,35)+'" stroke-width="3" opacity=".7"/>'}
 }else if(mode==='poster'){
  const words=(text||'CREATE SOMETHING GREAT').slice(0,54);
  const segments=words.match(/.{1,22}(?:\s|$)|.{1,22}/g)||[words];const lines=segments.slice(0,3).map(x=>x.trim());
  body='<defs><linearGradient id="poster" x1="0" y1="1" x2="1" y2="0"><stop stop-color="'+pick(210,70,19)+'"/><stop offset="1" stop-color="'+pick(25,85,41)+'"/></linearGradient></defs>'+
   '<rect width="960" height="640" fill="url(#poster)"/><circle cx="765" cy="145" r="230" fill="'+pick(105,75,65)+'" opacity=".5"/>'+
   '<circle cx="740" cy="150" r="160" fill="none" stroke="#ffffff" stroke-width="13" opacity=".5"/>'+
   '<path d="M0 550 L960 385 L960 640 L0 640Z" fill="#1b0e27" opacity=".56"/>'+
   '<text x="68" y="100" fill="#ffffff" font-family="system-ui,sans-serif" font-size="20" font-weight="750" letter-spacing="5">ORIGINAL CREATIVE PRINT</text>';
  lines.forEach((line,i)=>{body+='<text x="68" y="'+(232+i*86)+'" fill="#ffffff" font-family="system-ui,sans-serif" font-size="62" font-weight="900" letter-spacing="-1">'+xml(line)+'</text>'});
  body+='<path d="M68 520 H505" stroke="'+pick(200,82,80)+'" stroke-width="12" stroke-linecap="round"/>';
 }else if(mode==='avatar'){
  body='<rect x="260" y="48" width="440" height="440" rx="90" fill="'+pick(90,40,94)+'"/>'+
   '<rect x="282" y="70" width="396" height="396" rx="64" fill="'+pick(140,52,22)+'"/>';
  for(let row=0;row<5;row++)for(let col=0;col<5;col++){
   const mirror=col>2?4-col:col,cellHash=seedHash(text+'|'+salt+'|'+row+'|'+mirror);
   if((cellHash%5)!==0){
    const x=314+col*66,y=102+row*66;
    body+='<rect x="'+x+'" y="'+y+'" width="54" height="54" rx="'+(cellHash%2?10:26)+'" fill="'+hs((hue+cellHash%140)%360,60,cellHash%3===0?66:49)+'"/>';
   }
  }
  body+='<text x="480" y="548" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-weight="850" font-size="32">'+xml((text||'ORIGINAL EXPLORER').slice(0,30))+'</text>';
 }else if(mode==='mandala'){
  body='<defs><radialGradient id="mandala"><stop stop-color="'+pick(210,75,25)+'"/><stop offset="1" stop-color="'+pick(0,54,11)+'"/></radialGradient></defs><rect width="960" height="640" fill="url(#mandala)"/><g transform="translate(480 310)">';
  for(let ring=4;ring>=1;ring--){
   const petals=8*ring,rad=ring*67;
   for(let i=0;i<petals;i++){const angle=i*360/petals,rx=Math.round(11+ring*6+random()*8);
    body+='<ellipse cx="0" cy="-'+rad+'" rx="'+rx+'" ry="'+(26+ring*13)+'" transform="rotate('+angle+')" fill="'+pick(ring*42+i*5,72,49)+'" opacity=".68" stroke="#fff" stroke-opacity=".38" stroke-width="2"/>'}
  }
  body+='<circle r="35" fill="'+pick(160,72,77)+'" stroke="#fff" stroke-width="8"/></g>';
 }
 return svgShell(mode,text,body,hue);
}
