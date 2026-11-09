/* In-page, picture-led Developer source cards; no arbitrary code execution.
 * Real GitHub Search API pagination and verified official documentation.
 * Suggested changes are local drafts until a signed-in visitor submits a
 * reviewable GitHub Issue. No API secrets or GitHub write calls in this UI.
 */
import {
 DEVELOPMENT_TOPICS,OFFICIAL_DEVELOPER_SOURCES,buildGithubSearchURL,
 summarizeGithubPage,validateIndexedResource,classifyProposal,buildReviewIssueURL,existingCapabilityFor
} from './developer-discovery-core.mjs';
import {mountIndexedDeveloperPicker} from './developer-indexed-picker.mjs';

const el=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
};
const item=(label,value)=>{const p=el('p','devlib-meta');p.append(el('strong','',label+' '),el('span','',String(value)));return p;};
const WORKSHOP=Object.freeze({
 id:'quanta-idea-workshop',source:'QuantaPhi original',label:'Propose a site improvement',
 url:'https://quantaphi.org/',image:'/assets/phi-data-analyst.webp',license:'QuantaPhi original',
 licenseStatus:'first-party',description:'Design and preview an improvement, compare it with existing QuantaPhi features, then prepare an owner-reviewed proposal.',
 category:'profiles'
});
export function mountDeveloperDiscovery({root,stage,addResources,showIndex}){
 const panel=document.getElementById('developerDiscoveryControls');
 if(!root||!stage||!panel)return {render(){},hide(){}};
 const heading=panel.appendChild(el('h3','devlib-heading','Explore developer building blocks'));
 panel.appendChild(el('p','devlib-intro','Original site builders, official developer references, and thousands of real GitHub source cards. Search your indexed library first, then explore additional GitHub projects.'));
 const indexed=mountIndexedDeveloperPicker(panel,{stage,showIndex});
 const form=panel.appendChild(el('form','devlib-search'));
 form.setAttribute('aria-label','Find original developer resources');
 const category=form.appendChild(el('select','devlib-category'));
 category.setAttribute('aria-label','Developer topic');
 for(const topic of DEVELOPMENT_TOPICS){
  const option=el('option','',topic.label);option.value=topic.id;category.appendChild(option);
 }
 const query=form.appendChild(el('input','devlib-query'));
 query.type='search';query.autocomplete='off';query.maxLength=72;
 query.placeholder='Search within this topic';query.setAttribute('aria-label','Extra GitHub search terms');
 const search=form.appendChild(el('button','devlib-search-button','Find source cards'));search.type='submit';
 const actions=panel.appendChild(el('div','devlib-discovery-actions'));
 const more=actions.appendChild(el('button','devlib-more','Load next 40'));more.type='button';more.hidden=true;
 const sourceStatus=actions.appendChild(el('p','devlib-source-status','Official developer references are available. Search GitHub to discover more real projects.'));
 sourceStatus.setAttribute('role','status');sourceStatus.setAttribute('aria-live','polite');

 const slide=stage.appendChild(el('article','developer-slide developer-resource-slide'));
 slide.hidden=true;slide.setAttribute('role','group');slide.setAttribute('aria-label','Developer source resource and in-card workspace');
 const cover=slide.appendChild(el('div','developer-visual'));
 const art=cover.appendChild(el('div','developer-cover-art'));art.dataset.mode='contain';
 const image=art.appendChild(el('img','developer-cover-image'));
 image.alt='';image.loading='lazy';image.decoding='async';
 const caption=cover.appendChild(el('div','developer-cover-copy'));
 const kicker=caption.appendChild(el('small','developer-cover-kicker','SOURCE-BACKED · DEVELOPER LIBRARY'));
 const title=caption.appendChild(el('h3','developer-cover-title'));
 const description=caption.appendChild(el('p','developer-cover-description'));
 const facts=slide.appendChild(el('div','devlib-facts'));
 const sourceLink=slide.appendChild(el('a','devlib-source-link','Inspect original source'));
 sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
 const toggle=slide.appendChild(el('button','developer-studio-toggle','Work with this source · in this card'));
 toggle.type='button';toggle.setAttribute('aria-controls','devlibStudio');
 toggle.setAttribute('aria-expanded','false');
 const editor=slide.appendChild(el('div','developer-editor devlib-editor'));
 editor.id='devlibStudio';editor.hidden=true;
 const note=editor.appendChild(el('p','devlib-caution','Source code is not imported or executed. Never enter passwords, private identity numbers or payment details. A proposal opens a PUBLIC GitHub issue only after you choose it; the owner must approve changes.'));
 const topicLine=editor.appendChild(el('label','devlib-label','What part of QuantaPhi should this improve?'));
 const topicField=topicLine.appendChild(el('select','devlib-topic'));
 for(const topic of DEVELOPMENT_TOPICS){const op=el('option','',topic.label);op.value=topic.id;topicField.appendChild(op);}
 const comparison=editor.appendChild(el('p','devlib-comparison'));
 const ideaLine=editor.appendChild(el('label','devlib-label','Describe what you want to build'));
 const idea=ideaLine.appendChild(el('textarea','devlib-idea'));
 idea.placeholder='Example: make public profiles easier to edit, with accessible avatars and an easy-to-find edit button.';
 idea.maxLength=1100;idea.rows=4;
 const editorActions=editor.appendChild(el('div','devlib-editor-actions'));
 const preview=editorActions.appendChild(el('button','devlib-preview-button','Preview safe layout'));preview.type='button';
 const copy=editorActions.appendChild(el('button','devlib-copy-button','Copy Bubbles build brief'));copy.type='button';
 const feedback=editor.appendChild(el('p','devlib-feedback'));feedback.setAttribute('role','status');
 const previewStage=editor.appendChild(el('div','devlib-preview'));previewStage.hidden=true;
 const issueLink=editor.appendChild(el('a','devlib-review','Open public GitHub review issue'));
 issueLink.hidden=true;issueLink.target='_blank';issueLink.rel='noopener noreferrer';
 const ai=editor.appendChild(el('details','devlib-bubbles'));
 ai.appendChild(el('summary','', 'Talk with Bubbles in this card'));
 ai.appendChild(el('p','','Copy the brief above and paste it into Bubbles. This opens the existing QuantaPhi chat; it does not send or approve anything automatically.'));
 const chat=ai.appendChild(el('iframe','devlib-bubbles-frame'));
 chat.title='Existing Bubbles in-card assistant';chat.loading='lazy';
 chat.src='/bubbles.html?embed=1';chat.referrerPolicy='strict-origin-when-cross-origin';

 const drafts=new Map();let current=null,request=null,page=0,busy=false;
 const keys=new Set();
 const seen=new Set();
 function saveDraft(){
  if(!current)return;
  drafts.set(current.id,{topic:topicField.value,idea:idea.value});
 }
 function updateComparison(){
  const capability=existingCapabilityFor(topicField.value);
  comparison.textContent='Existing site: '+capability.status+' · '+capability.note;
  issueLink.hidden=true;
 }
 topicField.addEventListener('change',()=>{updateComparison();saveDraft();});
 idea.addEventListener('input',()=>{issueLink.hidden=true;saveDraft();});
 function renderPreview(){
  const verdict=classifyProposal(topicField.value,idea.value);
  feedback.textContent=verdict.reason;
  if(verdict.status==='blocked'||verdict.status==='restricted_review'){
   previewStage.hidden=true;previewStage.replaceChildren();issueLink.hidden=true;return false;
  }
  previewStage.hidden=false;previewStage.replaceChildren();
  const heading=previewStage.appendChild(el('h4','', 'Local design preview · not published'));
  const card=previewStage.appendChild(el('article','devlib-mock'));
  const topic=topicField.value;
  if(topic==='profiles'){
   const top=card.appendChild(el('div','devlib-mock-profile'));
   const avatar=top.appendChild(el('span','devlib-avatar','◇'));avatar.setAttribute('aria-hidden','true');
   const name=top.appendChild(el('div'));
   name.append(el('strong','','Display name'),el('p','','Public bio and optional avatar'));
   card.appendChild(el('button','devlib-mock-button','Edit public profile · demo')).type='button';
  }else if(topic==='carousels'||topic==='quick-cards'){
   card.append(el('strong','','‹  Example Quick Card  ›'),el('p','','Original artwork · description · working in-card actions'));
   card.appendChild(el('button','devlib-mock-button','Preview action · demo')).type='button';
  }else if(topic==='buttons'||topic==='menus'){
   const bar=card.appendChild(el('div','devlib-mock-buttons'));
   for(const label of ['Share','Collect','+1 Build'])bar.appendChild(el('button','devlib-mock-button',label)).type='button';
  }else if(topic==='power-chains'||topic==='ai'){
   card.append(el('p','','Idea  →  Safe preview  →  Owner review  →  Tests  →  Approved merge'));
  }else{
   card.append(el('strong','','Proposed '+DEVELOPMENT_TOPICS.find(t=>t.id===topic).label),
     el('p','',idea.value.slice(0,260)));
  }
  const safePreview=card.querySelectorAll('button');
  safePreview.forEach(b=>b.addEventListener('click',()=>{
   feedback.textContent='This is a local interface preview. No account, wallet or QuantaPhi content was changed.';
  }));
  const reviewUrl=buildReviewIssueURL({topic:topicField.value,idea:idea.value,source:current});
  issueLink.hidden=!reviewUrl;
  if(reviewUrl)issueLink.href=reviewUrl;
  return Boolean(reviewUrl);
 }
 preview.addEventListener('click',renderPreview);
 copy.addEventListener('click',async()=>{
  const verdict=classifyProposal(topicField.value,idea.value);
  if(verdict.status==='blocked'||verdict.status==='restricted_review'){feedback.textContent=verdict.reason;return;}
  const text=['QuantaPhi Developer proposal — review only',
   'Category: '+topicField.value,
   'My idea: '+idea.value.trim(),
   'Source: '+(current?.url||'none'),
   'Current site: '+verdict.capability.status+' — '+verdict.capability.note,
   'Please help me design and test a safe version. No automatic publishing or permissions.'].join('\n');
  try{await navigator.clipboard.writeText(text);feedback.textContent='Build brief copied. Paste it into the Bubbles chat below.';}
  catch{feedback.textContent='Clipboard permission unavailable; you can copy the description field into Bubbles.';}
 });
 toggle.addEventListener('click',()=>{
  editor.hidden=!editor.hidden;
  toggle.setAttribute('aria-expanded',String(!editor.hidden));
  toggle.textContent=editor.hidden?'Work with this source · in this card':'Hide workspace · keep my draft';
 });
 function render(source){
  if(!source)return;
  saveDraft();current=source;
  slide.hidden=false;
  image.src=source.image;
  image.alt=source.source+' artwork for '+source.label;
  art.classList.remove('developer-art-unavailable');
  image.hidden=false;
  image.onerror=()=>{image.hidden=true;art.classList.add('developer-art-unavailable');};
  kicker.textContent=source.source==='GitHub'?'GITHUB · REAL PUBLIC REPOSITORY':source.source==='QuantaPhi original'?'QUANTAPHI · BUILD WORKSHOP':'OFFICIAL · DEVELOPER REFERENCE';
  title.textContent=source.label;description.textContent=source.description;
  facts.replaceChildren();
  facts.append(item('Source:',source.source),item('Rights:',source.license||'Verify before copying'));
  if(source.stars!==null&&Number.isFinite(source.stars))facts.append(item('GitHub stars:',source.stars.toLocaleString()));
  if(source.pushedAt)facts.append(item('Last pushed:',source.pushedAt));
  sourceLink.href=source.url;
  sourceLink.textContent=source.source==='QuantaPhi original'?'Open QuantaPhi homepage':'Inspect original source';
  const draft=drafts.get(source.id);
  topicField.value=draft?.topic||source.category||'design-systems';
  idea.value=draft?.idea||'';
  editor.hidden=true;toggle.textContent='Work with this source · in this card';
  toggle.setAttribute('aria-expanded','false');
  feedback.textContent='';previewStage.replaceChildren();previewStage.hidden=true;issueLink.hidden=true;
  updateComparison();
 }
 function hide(){saveDraft();slide.hidden=true;}
 const initial=[WORKSHOP,...OFFICIAL_DEVELOPER_SOURCES];
 initial.forEach(x=>seen.add(x.id));
 const initialIndex=addResources(initial);
 indexed.addResources(initial,initialIndex);
 // An approved GitHub data-only PR can publish thousands of *source records*.
 // The snapshot is not code and never means those repositories can be executed.
 void fetch('/data/developer-source-catalog.json',{cache:'no-store'}).then(async response=>{
  if(!response.ok)return;
  const snapshot=await response.json();
  if(snapshot?.schema_version!==1||!Array.isArray(snapshot.items))return;
  const good=snapshot.items.map(validateIndexedResource).filter(Boolean)
   .filter(x=>!seen.has(x.id)).slice(0,5000);
  good.forEach(x=>seen.add(x.id));
  const firstIndex=addResources(good);
  indexed.addResources(good,firstIndex);
  if(page===0&&!busy&&good.length)
   sourceStatus.textContent='Indexed '+good.length.toLocaleString()+' genuine GitHub source cards for review. Browse with the arrows or search more. No third-party code is running.';
 }).catch(()=>{/* Only the real official cards appear if no reviewed snapshot exists. */});
 let lastCategory=category.value||DEVELOPMENT_TOPICS[0].id;
 async function searchPage(reset){
  if(busy)return;
  if(reset){page=0;lastCategory=category.value;request?.abort();}
  if(page>=10){sourceStatus.textContent='This topic reached GitHub’s 1,000-result search cap. Search another topic or refine your terms.';more.hidden=true;return;}
  busy=true;search.disabled=true;more.disabled=true;
  const nextPage=page+1;
  sourceStatus.textContent='Requesting public GitHub repositories for '+DEVELOPMENT_TOPICS.find(x=>x.id===lastCategory).label+' · page '+nextPage+'…';
  const controller=new AbortController();request=controller;
  try{
   const response=await fetch(buildGithubSearchURL(lastCategory,nextPage,query.value),{
    headers:{Accept:'application/vnd.github+json'},signal:controller.signal
   });
   if(!response.ok){
    sourceStatus.textContent=response.status===403||response.status===429?
     'GitHub search rate limit reached. Use the official cards or try later; no results were invented.':
     'GitHub search unavailable (HTTP '+response.status+'). Original cards remain usable.';
    return;
   }
   const data=summarizeGithubPage(await response.json(),lastCategory);
   const fresh=data.items.filter(x=>!seen.has(x.id));
   fresh.forEach(x=>seen.add(x.id));
   const firstIndex=addResources(fresh);
   indexed.addResources(fresh,firstIndex);
   page=nextPage;
   const maximum=Math.min(1000,data.reportedMatches);
   sourceStatus.textContent='Loaded '+fresh.length+' new original repositories (page '+page+'). GitHub reports '+data.reportedMatches.toLocaleString()+' matching results; at most 1,000 can be viewed per search'+(data.incomplete?' (search may be incomplete)':'')+'.';
   more.hidden=page>=10||page*40>=maximum;
   if(Number.isInteger(firstIndex)&&fresh.length)showIndex(firstIndex);
  }catch(error){
   if(error?.name!=='AbortError')sourceStatus.textContent='GitHub search could not load. Check connectivity or use the original developer cards.';
  }finally{
   busy=false;search.disabled=false;more.disabled=false;request=null;
  }
 }
 form.addEventListener('submit',event=>{event.preventDefault();void searchPage(true);});
 more.addEventListener('click',()=>void searchPage(false));
 return {render,hide};
}
