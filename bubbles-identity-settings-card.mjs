/* A first-party Quick Card leading to the actual existing Settings hub.
 * No sensitive form fields or documents ever render in the public carousel. */
import {IDENTITY_SETTING_LINKS} from './bubbles-identity-settings-core.mjs';
const host=document.getElementById('bubblesIdentitySettingsCard');
if(host){
 const element=(tag,cls,txt)=>{const e=document.createElement(tag);e.className=cls;if(txt)e.textContent=txt;return e};
 host.classList.add('bis-quick-card');
 const kicker=element('p','bis-kicker','INFINITY® · BUBBLES ACCOUNT');
 const h=element('h2','bis-title','Identity & Documents');
 const p=element('p','bis-copy','Profile, household income, SSI/SSDI award letters, ID proof, bank connections and security in one personal settings hub.');
 const row=element('div','bis-actions');
 for(const [label,href] of [['Open Identity Settings', '/bubbles-identity-settings.html'],
 ['Account connections',IDENTITY_SETTING_LINKS.connections],
 ['Home Access',IDENTITY_SETTING_LINKS.housing]]){
  const a=element('a','bis-button',label);a.href=href;row.append(a);
 }
 const note=element('p','bis-note','Sensitive uploads and SSN entry are locked pending secure first-party intake. No details are shared from this card.');
 host.replaceChildren(kicker,h,p,row,note);
}
