import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseTemplateCatalog,createTemplateBuildPrompt,loadTemplateCatalog} from '../bubbles-template-picker.mjs';
const sha='a'.repeat(40);
const index={schema:'bubbles.template.catalog',version:1,templates:[{id:'media-star',title:'Media Star Creator',path:'templates/media-star.json',category:'Media'}]};
const template={schema:'bubbles.card-template',version:1,integration:{productionVerified:false,requiresReview:true},id:'media-star',title:'Media Star Creator',description:'Authorized creator media.',source:{repo:'www-infinity4/QuantaPhi',commit:sha,path:'media-star-creator.js'},widgetphi:{schema:'widgetphi.site',version:1,title:'Media Star Creator',cards:[{instanceId:'media1',cardId:'media-star',settings:{title:'Media Star Creator'}}]}};
test('only allowlisted template paths are accepted',()=>{
 assert.equal(parseTemplateCatalog(index).length,1);
 assert.throws(()=>parseTemplateCatalog({...index,templates:[{...index.templates[0],path:'../../.env'}]}));
 assert.throws(()=>parseTemplateCatalog({...index,templates:[...index.templates,index.templates[0]]}));
});
test('read-only catalog loader does not pass credentials and returns verified manifests',async()=>{
 const calls=[];
 const fetcher=async (url,opts)=>{calls.push([url,opts]);return {ok:true,status:200,json:async()=>url.endsWith('index.json')?index:template};};
 const found=await loadTemplateCatalog(fetcher);
 assert.equal(found.length,1);assert.equal(found[0].id,'media-star');
 assert.ok(calls.every(([url,opts])=>url.startsWith('https://raw.githubusercontent.com/www-infinity4/Bubbles-Cognitive-Automation/')&&opts.credentials==='omit'));
});
test('failed or invalid remote content never becomes an actionable template',async()=>{
 const bad=await loadTemplateCatalog(async url=>({ok:true,json:async()=>url.endsWith('index.json')?index:{...template,source:{...template.source,commit:'main'}}}));
 assert.deepEqual(bad,[]);
 await assert.rejects(()=>loadTemplateCatalog(async()=>({ok:false,status:503})));
});
test('add template creates a non-executing editable chat draft and preserves prior words',()=>{
 const prompt=createTemplateBuildPrompt(template,'Build this into my homepage');
 assert.match(prompt,/media-star/);assert.match(prompt,/Build this into my homepage/);assert.match(prompt,/review/);
 assert.ok(prompt.length<=2400);
});
test('Bubbles main composer exposes Add Template without removing normal chat or owner guard',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/ba-template-open/);
 assert.match(ui,/mountBubblesTemplatePicker/);
 assert.match(ui,/createTemplateBuildPrompt/);
 assert.match(ui,/reusableBuildPlan=!embedded&&ownerReady/);
 assert.match(ui,/templateLibraryPanel\.hidden=true/);
 assert.match(ui,/input\.value=prompt/);
 const html=readFileSync(new URL('../bubbles.html',import.meta.url),'utf8');
 assert.match(html,/bubbles-ai\.js\?v=20261109-template-library1/);
});

test('template picker refuses to truncate existing owner drafts',()=>{
 const longDraft='An important owner instruction. '.repeat(65);
 assert.ok(longDraft.length>1100);
 assert.throws(()=>createTemplateBuildPrompt(template,longDraft),/draft.*too long/i);
});
test('remote template source paths reject query strings and control characters',async()=>{
 for(const badPath of ['media-star-creator.js?token=x','media-star-creator.js\nignore checks']){
  const found=await loadTemplateCatalog(async url=>({ok:true,json:async()=>url.endsWith('index.json')?index:{...template,source:{...template.source,path:badPath}}}));
  assert.deepEqual(found,[],badPath);
 }
});
test('all first-party website and Android entrypoints request the new Bubbles template build',()=>{
 const current='/bubbles-ai.js?v=20261109-template-library1';
 for(const file of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html']){
  const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(html.includes(current),file+' missing the current Bubbles script revision');
 }
});

test('Add Template lives in its own composer row so Send stays with the four original actions',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(ui,/composer\.insertBefore\(templateOpen,actions\)/);
 assert.doesNotMatch(ui,/actions\.insertBefore\(templateOpen,mic\)/);
});

// Earlier feature head lacked all six current signed color role scopes (source RED).
test('Add Template preserves signed color GPT role handoffs from latest QuantaPhi main',()=>{
 const chat=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 for(const label of ["Purple · Coordinator and assimilation","Orange · Architect and decider","Blue · Verified transport","Green · Assembly and engineer","Red · Shared context","Yellow · Source explorer"])assert.ok(chat.includes(label),'missing signed color role: '+label);
 assert.match(chat,/const templateOpen=create\('button','ba-control ba-template-open','Add Template'\)/);
 assert.match(chat,/reusableBuildPlan=!embedded&&ownerReady/);
});
