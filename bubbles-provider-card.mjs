/* First-party provider search adapters for the existing Bubbles card workspace.
 * Public search/navigation only. Does NOT imply a Facebook/Google/X login or
 * embed a third-party website that prohibits framing.
 */
export const PROVIDERS=Object.freeze({
 google:{title:'Google Search',host:'google.com',help:'Search the web without leaving the Bubbles card.',presets:['Google news','Google images','Google Trends'],official:'https://www.google.com/'},
 x:{title:'X',host:'x.com',help:'Find public posts. Reading a private account needs separate authorization.',presets:['X public posts','X Spaces','X news'],official:'https://x.com/'},
 facebook:{title:'Facebook',host:'facebook.com',help:'Search publicly indexed pages and events. Private posts need authorized provider access.',presets:['Facebook events','Facebook pages','Facebook public posts'],official:'https://www.facebook.com/'},
 instagram:{title:'Instagram',host:'instagram.com',help:'Discover public profiles and posts. Sign-in content is not accessible here.',presets:['Instagram profiles','Instagram reels','Instagram public posts'],official:'https://www.instagram.com/'},
 tiktok:{title:'TikTok',host:'tiktok.com',help:'Find public clips and creators using source-backed search.',presets:['TikTok videos','TikTok creators','TikTok trends'],official:'https://www.tiktok.com/'},
 guess:{title:'GUESS Jeans',host:'guess.com',help:'Explore GUESS denim with style and fit filters.',presets:["men's size 33 dark blue jeans","men's dark wash denim","GUESS denim fits"],official:'https://www.guess.com/'},
 'pepe-jeans':{title:'Pepe Jeans',host:'pepejeans.com',help:'Explore denim collections and official shopping pages.',presets:["men's size 33 dark blue jeans","men's dark wash denim","Pepe Jeans fits"],official:'https://www.pepejeans.com/'}
});
export function providerSearchUrl(id,term){
 const config=PROVIDERS[id];if(!config||!String(term||'').trim())return null;
 const q=(id==='google'?'':'site:'+config.host+' ')+String(term).slice(0,160);
 return '/infinity-search-results.html?'+new URLSearchParams({engine:'google',q});
}
export function mountProviderCard(doc=document){
 const root=doc.getElementById('providerCard');if(!root)return;
 const id=new URLSearchParams(location.search).get('provider');
 const data=Object.hasOwn(PROVIDERS,id)?PROVIDERS[id]:null;
 if(!data){root.textContent='Application card not registered.';return;}
 root.replaceChildren();
 const make=(tag,text)=>{const e=doc.createElement(tag);if(text)e.textContent=text;return e};
 root.append(make('h1',data.title),make('p',data.help));
 const tools=make('div');tools.className='tools';
 for(const name of data.presets){
  const link=make('a',name);link.href=providerSearchUrl(id,name);link.className='provider-quick-action';
  link.title='Search '+data.title+' for '+name;tools.append(link);
 }
 root.append(tools);
 if(id==='google'){
  const form=make('form'),input=make('input'),go=make('button','Search Google');
  input.type='search';input.required=true;input.maxLength=160;
  input.placeholder='Search anything';input.setAttribute('aria-label','Search Google');
  go.type='submit';form.append(input,go);
  form.addEventListener('submit',e=>{e.preventDefault();const target=providerSearchUrl(id,input.value.trim());if(target)location.assign(target)});
  root.append(form);
 }
 const official=make('a','Open original '+data.title+' website');official.href=data.official;
 official.target='_blank';official.rel='noopener noreferrer';official.style.marginTop='10px';
 root.append(official);
 root.append(make('small','These are interactive QuantaPhi search controls, not logged-in copies of another app.'));
}
if(typeof document!=='undefined')mountProviderCard(document);