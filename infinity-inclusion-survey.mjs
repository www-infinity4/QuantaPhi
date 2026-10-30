/* Public-source brand preflight, not approval or a full browser/AI audit. */
export const CHECKS=Object.freeze([
 {id:'identity',label:'Brand identity',terms:'about company official',pattern:/about|company|who we are|our story/i,action:'Make the official organization and its public contact details easy to verify.'},
 {id:'privacy',label:'Privacy transparency',terms:'privacy policy',pattern:/privacy|data protection/i,action:'Provide a clear privacy notice explaining data use and account controls.'},
 {id:'support',label:'Customer support',terms:'contact help customer service',pattern:/contact|support|help|customer service/i,action:'Make customer service routes and escalation options easy to locate.'},
 {id:'accessibility',label:'Accessibility',terms:'accessibility statement',pattern:/accessibility|special access|inclusive design/i,action:'Document accessibility practices and test keyboard, screen reader, contrast and mobile use.'},
 {id:'terms',label:'Transaction policies',terms:'returns refunds terms conditions',pattern:/terms|return|refund|conditions|policy/i,action:'Publish applicable purchase, cancellation, return and refund terms where relevant.'}
]);
export function candidate(raw){
 try{
  const u=new URL(String(raw||'').trim());
  if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443')return null;
  const host=u.hostname.toLowerCase().replace(/\.$/,'');
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host)||host.length>180||
   host==='localhost'||host.endsWith('.local')||host.endsWith('.internal')||
   /^\d+\.\d+\.\d+\.\d+$/.test(host))return null;
  return {host,origin:'https://'+host+'/'};
 }catch{return null}
}
export function sourceOnDomain(raw,host){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname===host||u.hostname.endsWith('.'+host))?u.href:null}catch{return null}
}
export function surveyFinding(check,data,host){
 const entries=Array.isArray(data?.results)?data.results:[];
 const evidence=entries.map(x=>({title:String(x.title||'').slice(0,170),url:sourceOnDomain(x.url,host)}))
  .filter(x=>x.url&&check.pattern.test(x.title+' '+new URL(x.url).pathname)).slice(0,2);
 return {id:check.id,label:check.label,action:check.action,evidence,confirmed:evidence.length>0};
}
const create=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const endpoint='https://orange-brook-a2ac.marvaseater.workers.dev/search';
async function query(host,check){
 const url=new URL(endpoint);url.search=new URLSearchParams({q:'site:'+host+' '+check.terms,format:'json',categories:'general',safesearch:'1'});
 const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(11000)});
 if(!response.ok)throw Error('search source unavailable');
 return response.json();
}
export function githubReviewUrl(domain,findings){
 const title='[Infinity inclusion survey] '+domain.host;
 const body=[
  '## Requested official domain','https://'+domain.host+'/',
  '## Public-source preflight','Automated search-index evidence only; not a browser/AI safety audit or Infinity approval.',
  ...findings.map(f=>'### '+f.label+' — '+(f.confirmed?'Public evidence found':'Not confirmed by this search')+'\n'+
   (f.evidence.map(x=>'- '+x.title+' — '+x.url).join('\n')||'- Suggested next verification: '+f.action)),
  '## Required independent review',
  '- [ ] Verify applicant authorization to speak for the brand',
  '- [ ] Independently browse core flows and demonstrate functional controls',
  '- [ ] Verify image/content usage rights and truthful brand association',
  '- [ ] Review accessibility, security, disclosures, data/privacy and purchase terms as applicable',
  '- [ ] Return a documented gap report and request corrections; do not approve automatically',
  'Applicant: do not include passwords or sensitive personal information in this public issue.'
 ].join('\n').slice(0,7200);
 const u=new URL('https://github.com/www-infinity4/QuantaPhi/issues/new');u.searchParams.set('title',title);u.searchParams.set('body',body);return u.href;
}
function init(){
 const form=document.getElementById('brandSurveyForm'),report=document.getElementById('brandSurveyReport');
 if(!form||!report)return;
 const input=document.getElementById('brandSurveyUrl'),status=document.getElementById('brandSurveyStatus');
 form.addEventListener('submit',async event=>{
  event.preventDefault();const domain=candidate(input.value);report.replaceChildren();
  if(!domain){status.textContent='Enter a public HTTPS website domain, such as https://www.ebay.com/.';return}
  status.textContent='Checking public search-index evidence for '+domain.host+'…';
  const results=await Promise.all(CHECKS.map(async check=>{
   try{return surveyFinding(check,await query(domain.host,check),domain.host)}
   catch{return {...surveyFinding(check,{},domain.host),unavailable:true}}
  }));
  const found=results.filter(x=>x.confirmed).length,unavailable=results.filter(x=>x.unavailable).length;
  const heading=create('h2','', 'Initial inclusion survey · '+domain.host);
  const explanation=create('p','',found+' of '+CHECKS.length+' public-evidence categories found. '+(unavailable?unavailable+' checks could not be retrieved. ':'')+'A missing search hit is not proof that a policy or feature is absent.');
  report.append(heading,explanation);
  for(const item of results){
   const section=create('section','survey-check'),h=create('h3','',item.label);
   section.append(h,create('p','',item.unavailable?'Search unavailable; needs verification.':item.confirmed?'Relevant official-source page(s) found; content and usability still need review.':'No matching official-source page confirmed by this index.'),
    create('p','survey-advice',item.action));
   for(const source of item.evidence){const link=create('a','',source.title);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';section.append(link)}
   report.append(section);
  }
  const caveat=create('p','survey-caveat','Next required gate: independent AI/browser inspection of real workflows, rights and accessibility, followed by owner review. This preliminary index survey does not establish compliance, endorsement or sponsorship.');
  const submit=create('a','survey-submit','Prepare public Infinity inclusion request');submit.href=githubReviewUrl(domain,results);submit.target='_blank';submit.rel='noopener noreferrer';
  const other=create('a','survey-affiliate','Affiliate and brand nomination form');other.href='/infinity-affiliates.html?product='+encodeURIComponent(domain.origin);
  report.append(caveat,submit,other);
  status.textContent='Preliminary source survey complete. An application is not submitted until the GitHub issue is reviewed and posted.';
 });
 const hint=new URLSearchParams(location.search).get('url');if(hint&&candidate(hint))input.value=candidate(hint).origin;
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
