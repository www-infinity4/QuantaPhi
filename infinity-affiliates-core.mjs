/* Infinity Affiliates: deterministic owner-curated brand matching and review requests.
 * Accepted brand != accepted product or authorized affiliate partnership.
 * There is no browser secret, cookie sharing, checkout or automatic approval. */
import {INFINITY_ACCEPTED_BRANDS} from './infinity-accepted-catalog.mjs';
export const AFFILIATE_ISSUES='https://github.com/www-infinity4/QuantaPhi/issues/new';
export const AFFILIATE_REQUEST_KINDS=Object.freeze([
 ['product-affiliation','Request product affiliation'],
 ['publisher-application','Apply to promote an Infinity Approved product'],
 ['brand-nomination','Nominate a new brand for Infinity review']
]);
export function safePublicUrl(raw){
 try{const text=String(raw||'').trim();if(!text||text.length>1600||/\s/.test(text))return '';
  const u=new URL(text);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.length>180)return '';
  if(!/^[a-z0-9.-]+$/.test(u.hostname)||!u.hostname.includes('.')||/\.{2,}/.test(u.hostname))return '';
  if(u.hostname==='localhost'||/^(?:127|10|192)\./.test(u.hostname))return '';
  u.hash='';return u.href;
 }catch{return ''}
}
export const acceptedBrandById=id=>INFINITY_ACCEPTED_BRANDS.find(b=>b.id===id)||null;
function hostFromUrl(url){try{return new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch{return ''}}
export function productMatchesBrand(url,brand){
 const u=safePublicUrl(url),v=brand&&hostFromUrl(brand.official||brand.seedUrl);
 if(!u||!v)return false;
 const host=new URL(u).hostname.toLowerCase();
 return host===v||host==='www.'+v||host.endsWith('.'+v);
}
export function findAcceptedBrandForProduct(raw){
 const url=safePublicUrl(raw);if(!url)return null;
 const candidates=INFINITY_ACCEPTED_BRANDS.filter(b=>productMatchesBrand(url,b));
 // More-specific domains win (for example a professional sub-brand).
 return candidates.sort((a,b)=>hostFromUrl(b.official).length-hostFromUrl(a.official).length)[0]||null;
}
const clean=(value,n=240)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
export function validateAffiliateRequest(input){
 const kind=clean(input?.kind,40);
 if(!AFFILIATE_REQUEST_KINDS.some(x=>x[0]===kind))return {ok:false,error:'Choose an affiliation request type.'};
 const productUrl=safePublicUrl(input?.productUrl);
 if(!productUrl)return {ok:false,error:'Enter a public HTTPS product or manufacturer URL.'};
 const title=clean(input?.productTitle,130);
 if(title.length<4)return {ok:false,error:'Enter a product or model name (at least four characters).'};
 const brand=acceptedBrandById(clean(input?.brandId,100));
 const brandName=brand?.name||clean(input?.newBrandName,95);
 if(brandName.length<2)return {ok:false,error:'Choose an approved brand or enter a proposed brand name.'};
 const relation=clean(input?.relation,50);
 if(!['publisher','seller','manufacturer','consumer'].includes(relation))return {ok:false,error:'Choose how you are connected to this product.'};
 if(kind!=='brand-nomination'&&!brand)return {ok:false,error:'This brand is not Infinity Approved. Request new-brand review first.'};
 if(brand&&!productMatchesBrand(productUrl,brand))return {ok:false,error:'The product link must belong to the selected official brand domain.'};
 const website=input?.publisherUrl?safePublicUrl(input.publisherUrl):'';
 if(input?.publisherUrl&&!website)return {ok:false,error:'Your public promotion site must use an HTTPS URL.'};
 const rationale=clean(input?.rationale,650);
 if(rationale.length<12)return {ok:false,error:'Explain the product and proposed affiliation in at least twelve characters.'};
 if(input?.consent!==true)return {ok:false,error:'Confirm that you understand this is a public review request, not affiliate approval.'};
 return {ok:true,request:{kind,productUrl,title,brandId:brand?.id||'',brandName,
   brandAccepted:Boolean(brand),relation,publisherUrl:website,rationale}};
}
export function affiliateIssueUrl(request){
 const r=request||{};const status=r.brandAccepted?'Infinity Accepted brand · PRODUCT NOT REVIEWED':'Proposed brand · NOT YET ACCEPTED';
 const title='[Infinity Affiliates] '+clean(r.kind,45)+' · '+clean(r.brandName,55)+' · '+clean(r.title,65);
 const body=[
 '## Infinity Affiliates · Product or publisher review','',
 '**Request type:** '+clean(r.kind,45),
 '**Brand:** '+clean(r.brandName,95),
 '**Brand catalog ID:** '+(clean(r.brandId,100)||'new brand nomination'),
 '**Review status:** '+status,
 '**Product/model:** '+clean(r.title,130),
 '**Official product URL:** '+safePublicUrl(r.productUrl),
 '**Requester role:** '+clean(r.relation,50),
 '**Public promotion website:** '+(safePublicUrl(r.publisherUrl)||'not supplied'),
 '',
 '### Proposal',clean(r.rationale,650),'',
 '### Required review gates',
 '- [ ] Brand / exact product source and rights verified',
 '- [ ] Brand permission or affiliate-program approval verified (if claimed)',
 '- [ ] Affiliate tracking and commission terms verified (if applicable)',
 '- [ ] Independent content, disclosures and merchant checkout reviewed',
 '',
 '> Submission is a public GitHub issue. QuantaPhi curation is not a manufacturer endorsement, affiliate agreement, or commission approval.',
 '> Do not post passwords, private email, financial account numbers or personal identification.'
 ].join('\n');
 const url=new URL(AFFILIATE_ISSUES);url.searchParams.set('title',title.slice(0,180));url.searchParams.set('body',body);return url.href;
}
export function groupApprovedBrands(filter='',limit=30){
 const q=clean(filter,80).toLowerCase();
 return INFINITY_ACCEPTED_BRANDS.filter(b=>!q||b.name.toLowerCase().includes(q)||b.category.toLowerCase().includes(q)).slice(0,limit);
}
