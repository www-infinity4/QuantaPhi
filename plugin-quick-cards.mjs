import {PLUGIN_QUICK_CARDS,PLUGIN_CATEGORIES,pluginQuickCard} from './plugin-quick-card-catalog.mjs';
import {createCardArtwork,mountCardTools} from './quanta-card-experience.mjs';
import {showCardWebsiteResults} from './tinyfish-card-reader.mjs';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const params=new URLSearchParams(location.search);
const filterInput=document.getElementById('iqpFilter');
const categoryInput=document.getElementById('iqpCategory');
const cardHost=document.getElementById('iqpCard');
const count=document.getElementById('iqpCount');
const status=document.getElementById('iqpStatus');
const previous=document.getElementById('iqpPrevious');
const next=document.getElementById('iqpNext');
let active=pluginQuickCard(params.get('card'))?.id||PLUGIN_QUICK_CARDS[0].id;
let eligible=PLUGIN_QUICK_CARDS;
for(const category of PLUGIN_CATEGORIES){
 const option=el('option','',category);option.value=category;categoryInput.append(option);
}
function external(label,href,kind=''){
 const a=el('a','iqp-btn '+kind,label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function filterCards(){
 const term=filterInput.value.normalize('NFKD').toLowerCase().trim().slice(0,100);
 const category=categoryInput.value;
 eligible=PLUGIN_QUICK_CARDS.filter(c=>(!category||c.category===category)&&(!term||(c.name+' '+c.feature+' '+c.category).toLowerCase().includes(term)));
 if(!eligible.some(c=>c.id===active))active=eligible[0]?.id||'';
 render();
}
function move(delta){
 if(!eligible.length)return;
 const index=eligible.findIndex(c=>c.id===active);
 active=eligible[(index+delta+eligible.length)%eligible.length].id;
 render(true);
}
function render(updateUrl=false){
 cardHost.replaceChildren();
 const card=pluginQuickCard(active);
 const index=eligible.findIndex(c=>c.id===active);
 count.textContent=eligible.length?(index+1)+' / '+eligible.length+' Quick Cards':'No matching cards';
 previous.disabled=next.disabled=eligible.length<=1;
 if(!card){cardHost.append(el('p','iqp-empty','No matching website cards. Try another category or keyword.'));return}
 if(updateUrl){const uri=new URL(location.href);uri.searchParams.set('card',card.id);history.replaceState(null,'',uri)}
 document.title=card.name+' · Infinity Plugin Quick Cards';
 const header=el('header','iqp-card-head');header.append(el('p','iqp-kicker','INFINITY 2026® · '+card.category),el('h2','',card.name),el('p','iqp-desc',card.feature));
 const art=createCardArtwork(card);
 const info=el('p','iqp-origin','Original source: '+new URL(card.official).hostname);
 const warning=el('p','iqp-warning',card.mode==='directory'?'This is a plugin-directory entry. The provider-specific website is not verified. Use ChatGPT Plugins to locate and authorize it.':card.mode==='plugin'?'This card links to official plugin information. Installation and account consent happen inside ChatGPT; no plugin authorization is inherited here.':'Independent QuantaPhi card. Public website information can be viewed; private feeds, accounts, edits and purchases require an approved connection.');
 const actions=el('div','iqp-actions');
 actions.append(external(card.mode==='directory'?'Find in ChatGPT Plugins ↗':card.mode==='plugin'?'Official plugin details ↗':'Open original website ↗',card.official,'iqp-primary'));
 const publicSearch=el('section','iqp-public-search');
 if(card.mode==='site'){
  publicSearch.append(el('h3','','Live original website content'));
  const explanation=el('p','iqp-message','Read public information through QuantaPhi’s verified website reader. Sources and receipts appear below; no website account is signed in.');
  const readButton=el('button','iqp-btn iqp-primary','Read website');readButton.type='button';
  const searchForm=el('form','iqp-public-form');
  const query=el('input','iqp-public-query');query.type='search';query.maxLength=180;query.required=true;
  query.placeholder='Search public website content…';query.setAttribute('aria-label','Search public pages from '+card.name);
  const searchButton=el('button','iqp-btn','Search website');searchButton.type='submit';
  searchForm.append(query,searchButton);
  const controls=el('div','iqp-actions');controls.append(readButton);
  const results=el('div','iqp-public-results');results.hidden=true;results.setAttribute('aria-live','polite');
  const run=async(action,term='')=>{
   readButton.disabled=searchButton.disabled=true;results.hidden=false;
   try{await showCardWebsiteResults(results,card.id,action,term)}
   catch{/* Verified reader renders its own error; never substitute an invented result. */}
   finally{readButton.disabled=searchButton.disabled=false}
  };
  readButton.addEventListener('click',()=>run('inspect'));
  searchForm.addEventListener('submit',event=>{
   event.preventDefault();const term=query.value.trim().slice(0,180);if(term.length<2)return;
   run('search',term);
  });
  publicSearch.append(explanation,controls,searchForm,results);
 }
 const details=el('section','iqp-workspace');
 details.append(el('h3','','Your task workspace'));
 const label=el('label','', 'Describe what you want to do with '+card.name);
 const entry=el('textarea','iqp-task');entry.rows=3;entry.maxLength=1500;entry.placeholder='Example: '+card.feature+'. Include your own requirements…';
 entry.id='iqpTaskInput';label.htmlFor=entry.id;
 const row=el('div','iqp-actions');
 const copy=el('button','iqp-btn iqp-primary','Copy task');copy.type='button';
 const state=el('p','iqp-message','Task stays on your device until you choose an action.');
 state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 copy.addEventListener('click',async()=>{
  const text=entry.value.trim();
  if(!text){state.textContent='Enter a task before copying.';entry.focus();return}
  const prompt='Use '+card.name+' for this task: '+text+'\nOfficial source: '+card.official+'\nRequire verified provider connection and confirmation for writes or purchases.';
  try{await navigator.clipboard.writeText(prompt);state.textContent='Task copied. You can paste it into Bubbles or the authorized provider.'}
  catch{entry.focus();entry.select();state.textContent='Clipboard unavailable. Select and copy your text manually.'}
 });
 row.append(copy);details.append(label,entry,row,state);
 const tools=el('section','iqp-tools');mountCardTools(tools,card);
 cardHost.append(header,art,info,warning,actions,publicSearch,details,tools);
 status.textContent=card.name+' · '+(index+1)+' of '+eligible.length;
}
previous.addEventListener('click',()=>move(-1));
next.addEventListener('click',()=>move(1));
filterInput.addEventListener('input',filterCards);
categoryInput.addEventListener('change',filterCards);
cardHost.addEventListener('keydown',event=>{
 if(event.target.closest('input,textarea,select,button,a'))return;
 if(event.key==='ArrowRight'){event.preventDefault();move(1)}
 if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
});
window.addEventListener('popstate',()=>{const requested=pluginQuickCard(new URLSearchParams(location.search).get('card'));if(requested){active=requested.id;filterInput.value='';categoryInput.value='';eligible=PLUGIN_QUICK_CARDS;render()}});
render();
