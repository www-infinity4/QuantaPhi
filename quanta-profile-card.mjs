/* Device-local profile onboarding. This is not wallet identity or verified sign-in. */
export const PROFILE_KEY='quantaphi:profile-preferences:v1';
export const profileComplete=()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}').complete===true}catch{return false}};
const el=(tag,cl,text)=>{const node=document.createElement(tag);if(cl)node.className=cl;if(text!==undefined)node.textContent=text;return node};
const topics=['Shopping','Music','Stories','Science','Television','History','DIY','Sports','Research'];
export function readProfileInterests(){
 try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');
  return p.complete===true&&Array.isArray(p.interests)?p.interests.filter(x=>topics.includes(x)).slice(0,topics.length):[];
 }catch{return []}
}
function readProfile(){try{const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return {}}}
function addStyles(){if(document.getElementById('qp-profile-css'))return;const link=el('link');link.id='qp-profile-css';link.rel='stylesheet';link.href='/quanta-profile-card.css?v=20261030-1';document.head.append(link)}
export function mountProfileCard(host,{onComplete=()=>{}}={}){
 if(!host)return;
 addStyles();
 const existing=readProfile();
 const card=el('section','qp-profile-card');
 card.setAttribute('aria-label','Your QuantaPhi profile and preferences');
 const header=el('header','qp-profile-header');
 header.append(el('p','qp-profile-eyebrow','INFINITY® · YOUR SPACE'),el('h2','','Your QuantaPhi Profile'),el('p','',existing.complete?'Update your interests and preferences whenever you like.':'Set up your interests once. Your profile card then leaves the discovery rotation and stays available in Settings.'));
 card.append(header);
 const note=el('p','qp-profile-note','This first version stores profile preferences on this browser only. It is not a Cloudflare, Google or wallet sign-in; it does not synchronize between devices or activate push delivery.');
 card.append(note);
 const form=el('form','qp-profile-form');
 const label=el('label','qp-profile-label','Display name (optional)');
 const display=el('input','qp-profile-input');display.name='displayName';display.type='text';display.maxLength=48;display.autocomplete='nickname';display.placeholder='How should QuantaPhi address you?';display.value=typeof existing.displayName==='string'?existing.displayName.slice(0,48):'';
 label.append(display);form.append(label);
 const topicSet=el('fieldset','qp-profile-fieldset');topicSet.append(el('legend','','What do you want to see?'));
 const topicGrid=el('div','qp-profile-topics'),saved=new Set(Array.isArray(existing.interests)?existing.interests:[]);
 for(const t of topics){const l=el('label','qp-profile-option'),b=el('input');b.type='checkbox';b.name='interest';b.value=t;b.checked=saved.has(t);l.append(b,document.createTextNode(' '+t));topicGrid.append(l)}
 topicSet.append(topicGrid);form.append(topicSet);
 const notify=el('fieldset','qp-profile-fieldset');notify.append(el('legend','','Notification preferences (delivery is not connected yet)'));
 const toggles=[['chat','Chat messages'],['wallet','Wallet receipts'],['ads','Advertising notices']];
 for(const [key,title] of toggles){const l=el('label','qp-profile-option'),b=el('input');b.type='checkbox';b.name='notify';b.value=key;b.checked=existing.notifications?.[key]===true;l.append(b,document.createTextNode(' '+title));notify.append(l)}
 form.append(notify);
 const actions=el('div','qp-profile-actions'),saveButton=el('button','qp-profile-save','Save profile');saveButton.type='submit';
 const result=el('p','qp-profile-result');result.setAttribute('role','status');
 actions.append(saveButton);form.append(actions,result);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const interests=[...form.querySelectorAll('input[name="interest"]:checked')].map(x=>x.value).filter(x=>topics.includes(x)).slice(0,9);
  const notifications=Object.fromEntries(toggles.map(([key])=>[key,!!form.querySelector('input[name="notify"][value="'+key+'"]:checked')]));
  const profile={version:1,complete:true,displayName:display.value.trim().slice(0,48),interests,notifications,updatedAt:new Date().toISOString()};
  try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile))}catch{result.textContent='Unable to save on this browser. Check storage settings.';return}
  result.textContent='Profile saved on this device. The onboarding card will no longer rotate in discovery.';
  window.dispatchEvent(new CustomEvent('quantaphi:profile-updated',{detail:{complete:true,interests}}));
  onComplete(profile);
 });
 card.append(form);
 const shortcuts=el('nav','qp-profile-shortcuts');shortcuts.setAttribute('aria-label','Account and privacy links');
 for(const [url,title] of [['/bubbles-accounts.html','Manage sign-in & connections'],['/wallet-link.html','Wallet connections'],['/privacy.html','Privacy & data policy']]){
  const link=el('a','qp-profile-link',title);link.href=url;shortcuts.append(link);
 }
 card.append(shortcuts);
 const navigation=el('p','qp-profile-footer','Privacy: You control these device preferences. Clearing site data removes them and will show onboarding again. Nothing here changes wallet balances.');
 card.append(navigation);host.replaceChildren(card);
}
