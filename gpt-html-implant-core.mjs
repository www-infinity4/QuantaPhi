/* GPT HTML Import: local sandbox preview, never first-party remote-code execution. */
export const PREVIEW_LIMIT = 150000;
export const DEFAULT_STARCOIN_PRICE = '1';
export function normalizePrice(mode,raw) {
  if(mode !== 'paid') return {mode:'free',starCoins:'0'};
  const price = String(raw ?? '').trim();
  // Decimal string, not a floating point number. No app-imposed price tiers.
  if(!/^[1-9][0-9]*$/.test(price) || price.length > 78) {
    return {error:'Enter a positive whole-StarCoin price (digits only).'};
  }
  return {mode:'paid',starCoins:price};
}
export function publicWebsite(value) {
  try {
    const u = new URL(String(value||'').trim());
    if(u.protocol!=='https:' || u.username || u.password || u.port || u.href.length>900)return '';
    const h=u.hostname.toLowerCase();
    if(!h.includes('.')||h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.onion')||
      /^\d+(?:\.\d+){3}$/.test(h) || h==='[::1]')return '';
    u.hash='';return u.href;
  }catch {return '';}
}
export function creatorProfile(raw) {
  try {
    const u=new URL(String(raw||'').trim());
    if(u.protocol!=='https:'||u.username||u.password||u.port||!['x.com','www.x.com','twitter.com','www.twitter.com'].includes(u.hostname))return '';
    const m=u.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
    if(!m||['i','home','intent','search','login','settings'].includes(m[1].toLowerCase()))return '';
    return 'https://x.com/'+m[1];
  }catch{return '';}
}
export function validateHtmlImport(code) {
  const html=String(code??'').replace(/^\uFEFF/,'');
  if(!html.trim())return {error:'Paste HTML or choose an .html file.'};
  if(new TextEncoder().encode(html).length>PREVIEW_LIMIT)return {error:'This preview exceeds the 150 KB local import limit.'};
  if(!/<(?:!doctype\s+html|html\b|main\b|div\b|canvas\b|body\b|section\b|script\b|svg\b)/i.test(html))return {error:'This import expects HTML source code, not a website URL.'};
  return {html};
}
export function isolatedPreviewDocument(source) {
  const validated=validateHtmlImport(source);
  if(validated.error)return validated;
  // CSP must precede the imported markup; relative URLs and external scripts are blocked.
  const prelude=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'"><meta name="referrer" content="no-referrer"><style>html,body{margin:0;min-height:100%;}</style></head><body>`;
  return {html:prelude+validated.html+'</body></html>'};
}
export function publisherDraftUrl({title,website,description,interactionRequest,mode,starCoins,profile}={}) {
  const checked=publicWebsite(website),price=normalizePrice(mode,starCoins);
  if(!checked)return {error:'Host the reviewed HTML at a public HTTPS address first.'};
  if(price.error)return price;
  const params=new URLSearchParams({
    title:String(title||'GPT-built App').slice(0,85),website:checked,
    description:String(description||'An original interactive tool created with GPT and submitted by its creator for review.').slice(0,600),
    interactionRequest:String(interactionRequest||'Run the creator-owned app with a safe, reliable user experience.').slice(0,500),
    monetization:price.mode,priceStarCoins:price.starCoins
  });
  const x=creatorProfile(profile);if(x)params.set('creatorProfile',x);
  return {url:'/quick-card-builder.html?'+params.toString(),monetization:price};
}
