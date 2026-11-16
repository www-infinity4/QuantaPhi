import {INFINITY_ACCEPTED_BRANDS,acceptedBrand} from './infinity-accepted-catalog.mjs';
import {AFFILIATE_REQUEST_KINDS,validateAffiliateRequest,affiliateIssueUrl,findAcceptedBrandForProduct,safePublicUrl,groupApprovedBrands} from './infinity-affiliates-core.mjs';
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e};
const DRAFT_KEY='quantaphi:infinity-affiliates:private-draft:v1';
const CARD_URL='https://quantaphi.org/infinity-affiliates.html';
const markup=`<div class="ia-hero">
 <div class="ia-kicker"><span>∞ INFINITY®</span><span>INDEPENDENT AFFILIATES NETWORK</span></div>
 <div class="ia-hero-body"><div class="ia-big-mark" aria-hidden="true">∞<span>APPROVED</span></div>
 <div><div class="ia-eyebrow">DISCOVER · MATCH · REQUEST</div><h2>YOUR PRODUCT.<br>THE RIGHT BRAND.</h2>
 <p>Connect a product to its existing Infinity Accepted manufacturer—and ask to become part of the affiliate network.</p>
 <div class="ia-hero-tags"><span>116 curated brands</span><span>Source-linked products</span><span>Owner review</span></div></div></div>
 </div>
 <div class="ia-inner">
  <div class="ia-heading"><div><h3>Find your approved brand</h3><p>Start with the official product link. Matching brand names appear automatically.</p></div><span class="ia-step">01 / DISCOVER</span></div>
  <div class="ia-match">
    <label for="iaProductUrl">Official product page URL</label>
    <input id="iaProductUrl" type="url" inputmode="url" autocomplete="url" placeholder="https://brand.com/products/your-item" maxlength="1600">
    <div class="ia-match-result" id="iaMatchResult" role="status" aria-live="polite">Paste a product link to match an Infinity Accepted brand.</div>
  </div>
  <div class="ia-brand-line"><label for="iaBrandSearch">Find an Infinity Accepted brand</label><span id="iaBrandCount"></span></div>
  <input id="iaBrandSearch" class="ia-brand-search" type="search" placeholder="Search tools, denim, electronics, outdoor…" maxlength="80" aria-label="Filter approved brands">
  <div class="ia-brand-list" id="iaBrandList" aria-label="Select an accepted brand"></div>
  <p class="ia-brand-foot">Infinity Accepted is QuantaPhi owner curation. It does not mean the company endorses us or that every individual product is approved.</p>
  <div class="ia-preview" id="iaPreview"><div class="ia-preview-mark" aria-hidden="true">∞</div><div><small>LIVE BRAND ASSOCIATION</small><h3 id="iaPreviewTitle">Choose a brand or paste a product link</h3><p id="iaPreviewState">Awaiting a matching, verified manufacturer domain</p><a id="iaOfficialLink" hidden target="_blank" rel="noopener noreferrer">View original manufacturer ↗</a></div></div>
  <div class="ia-heading ia-request-head"><div><h3>Request an affiliation</h3><p>Send the exact product and proposed relationship for Infinity review.</p></div><span class="ia-step">02 / REQUEST</span></div>
  <form id="iaForm" novalidate>
   <label>Request type<select id="iaKind" required></select></label>
   <div class="ia-form-grid">
    <label>Selected brand<select id="iaBrandSelect" required><option value="">Choose an approved brand</option><option value="__new__">Propose a new brand (not approved)</option></select></label>
    <label>Product / model name<input id="iaProductName" required minlength="4" maxlength="130" placeholder="Example: Lifetime cast-iron skillet"></label>
   </div>
   <label id="iaNewBrandWrap" hidden>New brand nomination<input id="iaNewBrand" maxlength="95" placeholder="Manufacturer name"></label>
   <div class="ia-form-grid">
    <label>Your role<select id="iaRelation" required>
      <option value="publisher">Publisher / affiliate applicant</option><option value="seller">Product seller</option>
      <option value="manufacturer">Brand / manufacturer representative</option><option value="consumer">Customer recommending a product</option>
    </select></label>
    <label>Public website (optional)<input id="iaPublisherUrl" type="url" inputmode="url" maxlength="1600" placeholder="https://your-public-site.com"></label>
   </div>
   <label>Why should it be affiliated?<textarea id="iaRationale" required minlength="12" maxlength="650" rows="4" placeholder="Describe the product, where you would promote it, and why it fits Infinity Approved."></textarea></label>
   <label class="ia-consent"><input type="checkbox" id="iaConsent" required><span>I understand this prepares a <strong>public GitHub review request</strong>, not an instant commission, brand endorsement, or approved affiliate contract. I will not include sensitive information.</span></label>
   <div class="ia-form-actions"><button type="submit" class="ia-prepare">Prepare affiliation request ↗</button><button type="button" id="iaDraft" class="ia-secondary">Save private draft</button></div>
   <p id="iaFeedback" role="status" aria-live="polite" class="ia-feedback">Requests need review before products can be marked approved or commission-bearing.</p>
   <div id="iaPrepared" class="ia-prepared" hidden><strong>Your review request is ready.</strong>
    <p>Continue to GitHub, sign in if needed, review the public information, and press <strong>Submit new issue</strong> there. A request is not filed just by preparing it here.</p>
    <a id="iaSubmitLink" class="ia-github" target="_blank" rel="noopener noreferrer">Continue to GitHub and submit ↗</a>
    <button type="button" id="iaCopy" class="ia-secondary">Copy request link</button>
   </div>
  </form>
  <div class="ia-foot-actions"><button type="button" id="iaShare">↗ Share Affiliates</button><button type="button" id="iaCollect">◇ Collect</button><a href="/quick-card-builder.html">+1 Build</a></div>
  <p class="ia-disclosure">Independent Infinity Approved directory and affiliation request system. Product matching checks the official brand website domain only; it does not confirm product authenticity, rights, affiliate eligibility, program acceptance, payouts, or commissions. Merchant checkout and final approval remain with their authorized parties.</p>
 </div>`;
function mount(host){
 if(!host||host.dataset.affiliateReady)return;
 host.classList.add('infinity-affiliates-card');host.innerHTML=markup;
 const $=id=>host.querySelector('#'+id);
 const product=$('iaProductUrl'),brandSearch=$('iaBrandSearch'),brandSelect=$('iaBrandSelect'),result=$('iaMatchResult');
 const form=$('iaForm'),feedback=$('iaFeedback'),previewTitle=$('iaPreviewTitle'),previewState=$('iaPreviewState');
 const official=$('iaOfficialLink'),newBrand=$('iaNewBrand'),newBrandWrap=$('iaNewBrandWrap'),kind=$('iaKind');
 const params=new URLSearchParams(location.search);
 let proposal=null;
 for(const [key,label] of AFFILIATE_REQUEST_KINDS){const opt=el('option',null,label);opt.value=key;kind.append(opt)}
 for(const b of INFINITY_ACCEPTED_BRANDS){const opt=el('option',null,b.name);opt.value=b.id;brandSelect.append(opt)}
 function draft(){return {kind:kind.value,brandId:brandSelect.value==='__new__'?'':brandSelect.value,
  newBrandName:newBrand.value,productUrl:product.value,productTitle:$('iaProductName').value,
  relation:$('iaRelation').value,publisherUrl:$('iaPublisherUrl').value,rationale:$('iaRationale').value,consent:$('iaConsent').checked}}
 function hideSubmission(){proposal=null;$('iaPrepared').hidden=true;$('iaSubmitLink').removeAttribute('href')}
 function showBrand(brand,matched){
  previewTitle.textContent=brand?.name||'New brand proposed for review';
  previewState.textContent=brand?
   (matched?'Official brand domain matched. Product and affiliate status still require review.':
    'Infinity Accepted brand selected. Paste a matching official product URL.'):
   'No approved-brand match. Use a new-brand nomination for review.';
  const href=brand&&safePublicUrl(brand.official||brand.seedUrl);
  official.hidden=!href;if(href)official.href=href;
  result.textContent=brand?(matched?'✓ Manufacturer website matched: '+brand.name+' · exact product not yet approved':
   '∞ Infinity Accepted: '+brand.name+' · product link needs confirmation'):
    'No approved manufacturer domain matched. You may nominate a new brand.';
  result.classList.toggle('ia-matched',Boolean(matched));
 }
 function renderBrands(){
  const values=groupApprovedBrands(brandSearch.value,24),holder=$('iaBrandList');holder.replaceChildren();
  $('iaBrandCount').textContent=values.length+' shown · '+INFINITY_ACCEPTED_BRANDS.length+' approved brands';
  for(const b of values){
   const button=el('button','ia-brand-button',b.name);
   button.type='button';button.dataset.brandId=b.id;
   button.setAttribute('aria-pressed',String(brandSelect.value===b.id));
   button.addEventListener('click',()=>{brandSelect.value=b.id;kind.value='product-affiliation';update({fromBrand:true});});
   holder.append(button);
  }
  if(!values.length)holder.append(el('p','ia-empty','No matching approved brand. Use “Propose a new brand” below.'));
 }
 function update({fromBrand=false,fromUrl=false}={}){
  hideSubmission();
  if(fromUrl){
   const match=findAcceptedBrandForProduct(product.value);
   if(match){brandSelect.value=match.id;if(kind.value==='brand-nomination')kind.value='product-affiliation'}
   else if(safePublicUrl(product.value)){brandSelect.value='__new__';kind.value='brand-nomination'}
  }
  if(brandSelect.value==='__new__'&&kind.value!=='brand-nomination')kind.value='brand-nomination';
  const b=INFINITY_ACCEPTED_BRANDS.find(x=>x.id===brandSelect.value);
  newBrandWrap.hidden=Boolean(b);
  const matched=Boolean(b&&product.value&&findAcceptedBrandForProduct(product.value)?.id===b.id);
  showBrand(b,matched);
  if(fromBrand&&b){brandSearch.value='';}
  renderBrands();
  if(fromBrand||fromUrl)feedback.textContent=b?
   'Brand association prepared. The exact product and affiliate arrangement still need review.':
   'Brand nomination selected. Explain the manufacturer and product before requesting review.';
 }
 product.addEventListener('input',()=>update({fromUrl:true}));
 brandSearch.addEventListener('input',renderBrands);
 brandSelect.addEventListener('change',()=>update({fromBrand:true}));
 kind.addEventListener('change',()=>{if(kind.value==='brand-nomination')brandSelect.value='__new__';update()});
 newBrand.addEventListener('input',hideSubmission);
 for(const e of form.querySelectorAll('input,select,textarea'))e.addEventListener('change',hideSubmission);
 form.addEventListener('submit',e=>{
  e.preventDefault();const checked=validateAffiliateRequest(draft());
  if(!checked.ok){feedback.textContent=checked.error;hideSubmission();return}
  proposal=checked.request;const link=affiliateIssueUrl(proposal);
  $('iaSubmitLink').href=link;$('iaPrepared').hidden=false;
  feedback.textContent='Request ready. Opening GitHub and submitting the issue is still required.';
  $('iaPrepared').scrollIntoView({block:'nearest',behavior:'smooth'});
 });
 $('iaCopy').addEventListener('click',async()=>{if(!proposal)return;
  const url=affiliateIssueUrl(proposal);
  try{await navigator.clipboard.writeText(url);feedback.textContent='Request link copied. Open it to submit on GitHub.'}
  catch{feedback.textContent='Clipboard unavailable; open the GitHub request link.'}
 });
 $('iaDraft').addEventListener('click',()=>{const data=draft();delete data.consent;
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(data));feedback.textContent='Saved private draft on this device. Not submitted or published.'}
  catch{feedback.textContent='Private storage unavailable. Request not saved.'}
 });
 $('iaShare').addEventListener('click',async()=>{
  try{if(navigator.share){await navigator.share({title:'Infinity Affiliates · QuantaPhi',url:CARD_URL});return}
   await navigator.clipboard.writeText(CARD_URL);feedback.textContent='Affiliate card link copied.'}
  catch(e){if(e.name!=='AbortError')feedback.textContent='Sharing unavailable on this device.'}
 });
 const collect=$('iaCollect');try{if(localStorage.getItem('quantaphi:affiliate:collected')==='1')collect.textContent='✓ Collected'}catch{}
 collect.addEventListener('click',()=>{try{localStorage.setItem('quantaphi:affiliate:collected','1');
 collect.textContent='✓ Collected';feedback.textContent='Saved on this device. No Star Coins minted.'}
 catch{feedback.textContent='Could not save the collection on this device.'}});
 const given=params.get('product')||'';if(safePublicUrl(given))product.value=given;
 const selected=params.get('brand')||'';if(acceptedBrand(selected))brandSelect.value=selected;
 const hint=params.get('name')||'';if(hint)$('iaProductName').value=hint.slice(0,130);
 const proposed=params.get('newBrand')||'';if(proposed)newBrand.value=proposed.slice(0,95);
 if(given)update({fromUrl:!selected});else update();
 host.dataset.affiliateReady='true';
}
if(typeof document!=='undefined'){
 const init=()=>{mount(document.getElementById('infinityAffiliates'));mount(document.getElementById('infinityAffiliatesStandalone'))};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
}
