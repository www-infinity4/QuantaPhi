import {mountCardActions} from '/quanta-card-actions.mjs';
import {makeShareButton,xShareLink} from '/quick-card-share.js?v=3';
const host=document.getElementById('publishedQuickCard');const slug=host?.dataset.cardSlug;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const browse=url=>{const a=el('a');a.href=url;a.dataset.siteUrl=url;a.dataset.siteTitle='Quick Card · Official website';if(typeof window.QuantaOpenSite==='function'){try{window.QuantaOpenSite(a);return}catch{}}window.open(url,'_blank','noopener,noreferrer');};
export function paintCard(container,c,{embedded=false}={}){
 if(!container||!c)return;
 const article=el('article','qcp-card');article.dataset.cardId='published-'+c.slug;
 const top=el('header','qcp-card-head');
 const badge=el('p','qcp-eyebrow','QUANTAPHI · ORIGINAL WEBSITE CARD');
 const title=el('h1','',c.title),desc=el('p','qcp-desc',c.description);
 top.append(badge,title,desc);article.append(top);
 const shareBar=el('div','qcp-share-prominent');
 const shareStatus=el('p','qcp-small');shareStatus.setAttribute('role','status');shareStatus.setAttribute('aria-live','polite');
 const share=makeShareButton({url:c.cardUrl,title:c.title+' · QuantaPhi Quick Card',image:c.image||'',description:c.description||'',label:'↗ Share this card',status:shareStatus});
 const xPost=el('a','qcp-x-share','Post card to X ↗');xPost.href=xShareLink(c.cardUrl,c.title,c.image||'',c.description||'');xPost.target='_blank';xPost.rel='noopener noreferrer';
 shareBar.append(share,xPost);article.append(shareBar,shareStatus);
 if(c.image){const image=el('img','qcp-art');image.src=c.image;image.alt='Artwork supplied for '+c.title;image.loading='lazy';image.referrerPolicy='no-referrer';image.addEventListener('error',()=>image.remove());article.append(image);}
 else article.append(el('div','qcp-brand',new URL(c.website).hostname.replace(/^www\./,'')));
 const info=el('section','qcp-interaction');
 info.append(el('h2','','Use this Quick Card'));
 if(c.kind==='search'&&c.searchTemplate){
  const form=el('form','qcp-search'),q=el('input');q.type='search';q.name='q';q.required=true;q.maxLength=160;q.placeholder='Search the original website';q.setAttribute('aria-label','Search '+c.title);
  const search=el('button','','Search');search.type='submit';form.append(q,search);
  form.addEventListener('submit',event=>{event.preventDefault();const val=q.value.trim();if(!val)return;const url=c.searchTemplate.replace('{query}',encodeURIComponent(val));browse(url);});
  info.append(form,el('p','qcp-small','Results come from the original website.'));
 }else if(c.kind==='video'&&c.videoId){
  const frame=el('iframe','qcp-video');frame.src='https://www.youtube-nocookie.com/embed/'+c.videoId;frame.title=c.title+' video';frame.allow='accelerometer; encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;frame.loading='lazy';info.append(frame);
 }else{
  info.append(el('p','', 'The requested interaction is recorded for Bubbles to build. This first release opens the original website; it does not pretend the advanced feature is connected.'));
 }
 const official=el('button','qcp-official','Open original website ↗');official.type='button';official.addEventListener('click',()=>browse(c.website));info.append(official);
 info.append(el('h3','','Requested Bubbles interaction'),el('p','qcp-request',c.interactionRequest));
 article.append(info);
 const controls=el('div','qcp-actions');article.append(controls);
 mountCardActions(controls,{id:'published-'+c.slug,name:c.title,category:'Community Quick Card',route:'/cards/'+c.slug,website:c.website,url:c.website,shareImage:c.image||'',shareDescription:c.description||''});
 const foot=el('p','qcp-small',c.status==='approved'?'Approved for public discovery; Quant matching determines placement.':'This card is shareable by URL. Main-feed placement is pending review.');
 article.append(foot);
 const embed=el('div','qcp-embed'); const code=el('input');code.readOnly=true;code.value='<iframe title="'+c.title.replace(/"/g,'')+'" src="'+c.cardUrl+'" loading="lazy" width="100%" height="720"></iframe>';code.setAttribute('aria-label','Copy embeddable iframe HTML');
 const copy=el('button','','Copy embed');copy.type='button';copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.value);copy.textContent='Copied';}catch{code.focus();code.select();}});
 embed.append(el('h3','','Embed this card on your own site'),code,copy);article.append(embed);
 container.replaceChildren(article);
 return article;
}
if(host&&slug){fetch('/api/quick-cards/'+encodeURIComponent(slug),{cache:'no-store'}).then(r=>r.json().then(data=>({ok:r.ok,data}))).then(({ok,data})=>{
 if(!ok||!data.ok)throw Error(data.error||'Card unavailable');
 paintCard(host,data.card);
 document.title=data.card.title+' · QuantaPhi Quick Card';
 const script=document.createElement('script');script.src='/bubbles-embed.js';script.dataset.bubbleId='published-'+data.card.slug;
 script.dataset.bubbleName='Bubbles · '+data.card.title.slice(0,35);script.dataset.bubbleRole='builder';
 script.dataset.bubbleInstructions=('Assist with a user-created QuantaPhi card. Official site: '+data.card.website+'. Requested interaction: '+data.card.interactionRequest+'. This is a public request, not authority to deploy, take payments, read private logins or impersonate the website.').slice(0,800);
 document.body.append(script);
}).catch(e=>host.replaceChildren(el('p','qcp-error',e.message)));}
