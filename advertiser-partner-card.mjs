/* Commercial advertiser inquiry only. No charge, gift or prioritization. */
import {validatePartnerProposal,partnerProposalIssueUrl} from './advertiser-partner-core.mjs';
const markup=[
'<section class="ia-advertiser" aria-labelledby="iaAdsTitle">',
'<p class="ia-advertiser-kicker">INFINITY® · ADVERTISER PARTNERS</p>',
'<h3 id="iaAdsTitle">Support helpful advertising</h3>',
'<p>Brands can support independent Quick Cards after seeing value, or request a separately approved 30-day promotion. No payment is required for ordinary editorial catalog eligibility.</p>',
'<form class="ia-advertiser-form" id="iaAdForm" novalidate>',
'<fieldset><legend>Choose a partnership</legend>',
'<label class="ia-advertiser-choice"><input type="radio" name="ia-ad-program" value="voluntary-support" checked>',
'<span><strong>Voluntary contribution</strong><small>Optional thank-you payment after advertising has helped. No required amount, purchased priority or automatic charge. This is commercial support, not a tax-deductible charitable donation.</small></span></label>',
'<label class="ia-advertiser-choice"><input type="radio" name="ia-ad-program" value="performance-review">',
'<span><strong>$100 · 30-day performance review</strong><small>Proposed $1,000 target in verified QuantaPhi-attributed net sales. Under the proposed rule, a $100 fee would apply if verified net sales remain below $1,000 after 30 days—not a guaranteed $1,000 in sales.</small></span></label>',
'</fieldset><div class="ia-advertiser-fields">',
'<label>Public business name<input type="text" name="businessName" required minlength="3" maxlength="95" autocomplete="organization" placeholder="Your business or brand"></label>',
'<label>Official business website<input type="url" name="siteUrl" required maxlength="1600" inputmode="url" placeholder="https://yourbrand.com"></label>',
'</div><label>Optional public details<textarea name="details" rows="3" maxlength="700" placeholder="Products or services to showcase; no private customer or payment data."></textarea></label>',
'<label id="iaUnderTarget" class="ia-advertiser-consent" hidden><input type="checkbox" name="underTargetFeeAcknowledged"><span>I understand this proposed offer would charge $100 if verified net attributed sales are below $1,000 at 30 days. It is not a sales guarantee. Separate signed terms are required before any charge.</span></label>',
'<label class="ia-advertiser-consent"><input type="checkbox" name="acknowledge" required><span>This prepares a public GitHub review request. It does not start a campaign or authorize payment.</span></label>',
'<button type="submit" class="ia-advertiser-prepare">Prepare review request</button>',
'<p class="ia-advertiser-feedback" role="status" aria-live="polite">No ranking advantage is purchased here. Merchant tracking consent and written terms require separate approval.</p>',
'<div id="iaAdPrepared" class="ia-advertiser-prepared" hidden><strong>Review request prepared — NOT an invoice.</strong><p>Open GitHub and submit the public request yourself. No payment was collected and no campaign is active.</p>',
'<a id="iaAdReviewLink" rel="noopener noreferrer" target="_blank">Continue to GitHub review</a></div>',
'</form><p class="ia-advertiser-small">Sales totals require opted-in merchant-authorized paid orders attributed to QuantaPhi during the 30-day campaign, net of refunds and chargebacks. Clicks, estimates and unmatched transactions do not count. No verified report means no billing.</p></section>'
].join('');
export function mountAdvertiserPartnerProgram(container){
 if(!container||container.dataset.advertiserMounted==='true')return;
 container.innerHTML=markup;
 const form=container.querySelector('#iaAdForm');
 const fee=form.querySelector('#iaUnderTarget');
 const prepared=form.querySelector('#iaAdPrepared');
 const info=form.querySelector('.ia-advertiser-feedback');
 const link=form.querySelector('#iaAdReviewLink');
 const plan=()=>form.querySelector('input[name="ia-ad-program"]:checked')?.value;
 const sync=()=>{
  fee.hidden=plan()!=='performance-review';
  if(fee.hidden)fee.querySelector('input').checked=false;
  prepared.hidden=true;link.removeAttribute('href');
 };
 form.querySelectorAll('input[name="ia-ad-program"]').forEach(r=>r.addEventListener('change',sync));
 form.addEventListener('input',()=>{prepared.hidden=true;link.removeAttribute('href')});
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const fields=Object.fromEntries(new FormData(form).entries());
  fields.plan=plan();
  fields.acknowledge=form.elements.namedItem('acknowledge')?.checked===true;
  fields.underTargetFeeAcknowledged=fee.querySelector('input').checked===true;
  const checked=validatePartnerProposal(fields);
  if(!checked.ok){info.textContent=checked.error;prepared.hidden=true;return;}
  link.href=partnerProposalIssueUrl(checked.request);
  prepared.hidden=false;
  info.textContent='Review link prepared. No payment, preferential placement, campaign or order attribution was created.';
 });
 sync();container.dataset.advertiserMounted='true';
}
