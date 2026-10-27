import {mountQuickCardTinyfishTools} from './quick-card-tinyfish-actions.mjs';
// Small native quick-card launcher: official provider UI remains on its own domain.
// Each user signs into that site directly. No third-party cookies or passwords are read.
export const PROVIDER_DESTINATIONS=Object.freeze({
 gemini:['Google Gemini','https://gemini.google.com/app'],
 claude:['Anthropic Claude','https://claude.ai/'],
 copilot:['GitHub Copilot','https://github.com/copilot'],
 'microsoft-copilot':['Microsoft Copilot','https://copilot.microsoft.com/'],
 'ibm-watsonx':['IBM watsonx','https://www.ibm.com/watsonx'],
 starmaker:['StarMaker','https://www.starmakerstudios.com/en/songs'],
 levis:["Levi's",'https://www.levi.com/US/en_US/']
});
export function officialProviderUrl(id){return PROVIDER_DESTINATIONS[id]?.[1]||null;}
export function mountProviderActions(root,card){
 const value=PROVIDER_DESTINATIONS[card?.id];if(!root||!value)return;
 const wrapper=document.createElement('div');wrapper.className='iqc-provider-actions';
 const a=document.createElement('a');a.className='iqc-provider-link';
 a.href=value[1];a.target='_blank';a.rel='noopener noreferrer';
 a.textContent='Open '+value[0]+' · official website';wrapper.append(a);
 const p=document.createElement('p');p.className='iqc-provider-info';
 p.textContent=card.id==='levis'
 ? 'Shop and pay on the official Levi’s checkout. QuantaPhi does not collect payment credentials.'
 : 'Sign in on the provider website to see your own history. QuantaPhi does not receive your password or private conversations.';
 wrapper.append(p);root.append(wrapper);
 void mountQuickCardTinyfishTools(wrapper,card);
}
