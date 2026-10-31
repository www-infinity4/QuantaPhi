/* C13B0 Quick Card Wiring: visible URL contracts, never cross-origin credential scraping.
 * The browser may show another site in an iframe if that site allows it, but
 * this page cannot read provider DOM/cookies or authorize a Bubbles account.
 */
import {cardProvider,providerSearchUrl,quickCardManifest} from './quanta-card-provider.mjs';

export function safeSourceUrl(raw){
 try {
  const u=new URL(String(raw||'').trim());
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  if(!/^[a-z0-9.-]+$/i.test(u.hostname)||u.hostname==='localhost'||u.hostname.endsWith('.localhost'))return null;
  return u;
 }catch{return null}
}
const makeRow=(key,name,route,mode,proof)=>({key,name,route,mode,proof});
export function identifyWiring(raw){
 const url=safeSourceUrl(raw);
 if(!url) return null;
 const provider=cardProvider({id:'study',official:url.href});
 const manifest=quickCardManifest({id:'study',official:url.href});
 const home=url.origin+'/';
 const rows=[
  makeRow('01','Official source',url.href,'original-website','Link is an HTTPS address; provider ownership is not inferred from a title.'),
  makeRow('02','Real sign-in',provider?.hasDedicatedSignin?provider.signin:null,'provider-owned-tab',
   'Provider sign-in takes place at the provider. No credentials or cookies copied.'),
  makeRow('03','Useful navigation',providerSearchUrl(provider,'example')||url.href,'real-url',
   'Search route is only prefilled for a known verified provider; other sites require an observed URL.'),
  makeRow('04','Website display',url.href,'iframe-if-permitted',
   'Framing may be denied by CSP or X-Frame-Options. Parent cannot read its DOM.'),
  makeRow('05','Logged-in data',null,'requires-approved-connector',
   'Signing in to the original page does not give QuantaPhi read rights over personal content.'),
  makeRow('06','Bubbles browser work',null,'user-authorized-work-session',
   'Cloud browser operates its separately authorized session; import only approved results and evidence, not cookies.'),
  makeRow('07','Quick Card controls',null,'quanta-local-actions',
   'Follow · Star · Collect · Share · +1 Build; wallet/cloud reward must have a verified receipt.'),
  makeRow('08','Permission & proof',null,'explicit-consent-and-receipt',
   'Record who allowed which action, dated original link, status and observed result.')
 ];
 if(provider?.id==='starmaker'){
  rows.splice(3,0,makeRow('03a','Official songbook','https://www.starmakerstudios.com/en/songs','original-songbook','Open StarMaker songbook on its official site; protected tracks remain there.'));
  rows.splice(4,0,makeRow('03b','QuantaPhi study demo','https://quantaphi.org/starmaker-embed.html','existing-quanta-card','Existing QuantaPhi mini card with song picks, local karaoke lab and original-site actions.'));
 }
 return {schema:'infinity.quick-card-wiring.v1',generatedBy:'QuantaPhi',source:url.href,origin:home,
  provider:provider?.id||null,providerName:provider?.name||null,providerLogin:provider?.hasDedicatedSignin?provider.signin:null,
  browserView:'iframe-if-permitted-with-original-fallback',accountStatus:'not-verified',accountData:'not-connected',
  apiAccess:manifest.apiAccess,actions:manifest.interactions.filter(x=>['follow','star','collect','share','search','build'].includes(x)),keys:rows};
}
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n};
const link=(label,href)=>{const a=el('a',label,'qws-link');a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a};
const STARM='https://www.starmakerstudios.com/en/songs';
const CART=`cd ~
cat > c13b0-quick-card-wiring.sh <<'C13B0'
#!/data/data/com.termux/files/usr/bin/bash
set -eu
curl -fLsS --retry 2 https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/scripts/c13b0-quick-card-wiring.sh -o "$HOME/c13b0-quick-card-wiring-runner.sh"
chmod +x "$HOME/c13b0-quick-card-wiring-runner.sh"
exec "$HOME/c13b0-quick-card-wiring-runner.sh" "$@"
C13B0
chmod +x ~/c13b0-quick-card-wiring.sh
~/c13b0-quick-card-wiring.sh`;
export function mountWiringStudy(doc=document){
 const form=doc.getElementById('qwsForm');if(!form)return;
 const input=doc.getElementById('qwsSource'),title=doc.getElementById('qwsCurrent');
 const list=doc.getElementById('qwsRows'),report=doc.getElementById('qwsReport');
 const original=doc.getElementById('qwsOriginal'),signin=doc.getElementById('qwsSignin');
 const iframeButton=doc.getElementById('qwsFrameButton'),frame=doc.getElementById('qwsFrame');
 const frameStatus=doc.getElementById('qwsFrameStatus'),copy=doc.getElementById('qwsCopy');
 const snippet=doc.getElementById('qwsJSON'),termux=doc.getElementById('qwsCart'),termuxCopy=doc.getElementById('qwsCopyCart');
 const publish=doc.getElementById('qwsPublish');
 termux.value=CART;
 let current=null;
 const describe=sheet=>{const rows=sheet.keys;
  list.replaceChildren();
  for(const x of rows){
   const row=el('div','','qws-row');
   row.append(el('span',x.key,'qws-id'));
   const body=el('div','','qws-row-body');
   body.append(el('strong',x.name),el('small',x.proof));
   if(x.route)body.append(link('Open verified route ↗',x.route));
   else body.append(el('small','No direct URL or active grant yet.','qws-absent'));
   row.append(body,el('span',x.mode.replaceAll('-',' '),'qws-mode'));
   list.append(row);
  }
 };
 const build=()=>{
  const sheet=identifyWiring(input.value);
  if(!sheet){report.textContent='Enter a valid HTTPS website address without embedded passwords or custom ports.';return;}
  current=sheet;title.textContent=(sheet.providerName||'Unregistered public website')+' · wiring worksheet';
  describe(sheet);
  original.href=sheet.source;original.textContent='Open original website ↗';
  signin.hidden=!sheet.providerLogin;
  if(sheet.providerLogin){signin.href=sheet.providerLogin;signin.textContent='Sign in at '+sheet.providerName+' ↗';}
  snippet.value=JSON.stringify(sheet,null,2);
  frame.hidden=true;frame.removeAttribute('src');frameStatus.textContent='Original site not loaded into the study viewer.';
  const query=new URLSearchParams({title:(sheet.providerName||'My source')+' Quick Card',website:sheet.source});
  publish.href='/quick-card-builder.html?'+query;
  report.textContent=(sheet.providerName?'Recognized official provider: '+sheet.providerName+'. ':'General website worksheet. ')+
   'These are wiring keys, not permissions or a copy of third-party code.';
 };
 async function copyText(value,inputArea,label){
  if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(value);report.textContent=label+' copied.';return}catch{}}
  inputArea.focus();inputArea.select();report.textContent='Clipboard unavailable. Select and copy this '+label+'.';
 }
 form.addEventListener('submit',e=>{e.preventDefault();build();});
 iframeButton.addEventListener('click',()=>{
  if(!current)return;
  frame.hidden=false;frame.src=current.source;
  frameStatus.textContent='Attempted original-site frame. It may be blocked or signed out; open the original website if blank. QuantaPhi cannot inspect its session.';
 });
 copy.addEventListener('click',()=>{if(current)void copyText(snippet.value,snippet,'worksheet JSON');});
 termuxCopy.addEventListener('click',()=>void copyText(CART,termux,'C13B0 installation command'));
 const params=new URLSearchParams(location.search),site=params.get('website');
 if(site&&safeSourceUrl(site))input.value=site;
 else input.value=STARM;
 build();
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountWiringStudy(),{once:true});
 else mountWiringStudy();
}
