/* Genuine third-party website surfaces: browser loads official origins only.
 * No copied credentials, scraped messages, mocked ChatGPT replies, proxy or
 * cross-origin DOM access. The destination controls whether framing is allowed.
 */
export const OFFICIAL_VIEWS=Object.freeze({
 chatgpt:Object.freeze({title:'ChatGPT',url:'https://chatgpt.com/',label:'ChatGPT website'})
});
export function officialView(id){return Object.hasOwn(OFFICIAL_VIEWS,String(id||''))?OFFICIAL_VIEWS[id]:null}
const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const anchor=(label,url,css)=>{const a=el('a',css,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
export function mountOfficialViewer(root,id){
 const site=officialView(id);if(!root||!site)return null;
 if(root.querySelector('[data-official-viewer="'+id+'"]'))return root.querySelector('[data-official-viewer="'+id+'"]');
 const panel=el('section','qov-card');panel.dataset.officialViewer=id;
 const eyebrow=el('p','qov-eyebrow','QUANTAPHI · OFFICIAL WEBSITE');
 const title=el('h3','',site.title+' · Web app');
 const desc=el('p','qov-help','Use the real '+site.title+' sign-in and interface. The login happens on '+new URL(site.url).hostname+', not QuantaPhi.');
 const actions=el('div','qov-actions');
 const login=anchor('Sign in at '+site.title,site.url,'qov-primary');
 const full=anchor('Open original '+site.title,site.url,'qov-secondary');
 const viewer=el('a','qov-secondary','Open full-screen viewer');
 viewer.href='/website-viewer.html?site='+encodeURIComponent(id);viewer.target='_self';
 actions.append(login,full,viewer);
 const previewButton=el('button','qov-preview','Try real website in this card');
 previewButton.type='button';previewButton.setAttribute('aria-expanded','false');
 const status=el('p','qov-help','The original site may restrict embedding. If it does, use the official website button above. QuantaPhi cannot read or mirror your private conversation from a frame.');
 status.setAttribute('role','status');
 const frameBox=el('div','qov-frame-box');frameBox.hidden=true;
 let frame=null;
 previewButton.addEventListener('click',()=>{
  if(!frame){
   frame=el('iframe','qov-frame');
   frame.title='Official '+site.title+' website';
   frame.src=site.url;
   frame.loading='lazy';
   frame.referrerPolicy='no-referrer';
   frame.setAttribute('allow','clipboard-write; microphone');
   frameBox.append(frame);
   frameBox.hidden=false;
   previewButton.textContent='Close website viewer';
   previewButton.setAttribute('aria-expanded','true');
   status.textContent='Loading requested from '+site.url+' in your browser. If you see a blocked frame, choose Open original '+site.title+'. A frame loading event cannot prove successful sign-in.';
  }else{
   frame.remove();frame=null;frameBox.hidden=true;
   previewButton.textContent='Try real website in this card';
   previewButton.setAttribute('aria-expanded','false');
   status.textContent='The original site controls embedding and sign-in. Continue in the official website if the embedded view is unavailable.';
  }
 });
 panel.append(eyebrow,title,desc,actions,previewButton,status,frameBox);
 root.append(panel);
 return panel;
}
if(typeof document!=='undefined'&&document.getElementById('officialWebsiteViewer')){
 const id=new URLSearchParams(location.search).get('site')||'chatgpt';
 const root=document.getElementById('officialWebsiteViewer');
 if(officialView(id)){
  document.title=officialView(id).title+' · QuantaPhi Website Viewer';
  mountOfficialViewer(root,id);
 }else root.append(el('p','','This official website is not in the verified viewer catalog.'));
}
