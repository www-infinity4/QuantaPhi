import {ALL_FEED_CARDS} from './quanta-feed.mjs';
import {suggestFeedSearch} from './quanta-feed-search-assist.mjs';

// Attaches ONLY to the existing, top-of-homepage Search input. Suggestions
// come from already-published Quick Cards: never send partial typed queries
// to another provider, submit the search, open a source or change account data.
function mountHomeSearchAssistance(){
 const search=document.getElementById('q');
 const wrapper=search?.closest('.search');
 if(!search||!wrapper||wrapper.querySelector('#quantaHomeSearchSuggestions'))return;
 const panel=document.createElement('div');
 panel.id='quantaHomeSearchSuggestions';
 panel.className='qhss-panel';
 panel.hidden=true;
 panel.setAttribute('role','region');
 panel.setAttribute('aria-label','Source-backed Quick Card suggestions');
 search.setAttribute('aria-controls',panel.id);
 search.setAttribute('aria-expanded','false');
 wrapper.append(panel);
 const hide=()=>{panel.hidden=true;search.setAttribute('aria-expanded','false');};
 const display=()=>{
  const rows=suggestFeedSearch(ALL_FEED_CARDS,search.value,{limit:6});
  panel.replaceChildren();
  for(const suggestion of rows){
   const item=document.createElement('div');
   item.className='qhss-row';
   const fill=document.createElement('button');
   fill.type='button';
   fill.className='qhss-fill';
   fill.textContent=suggestion.label+' · '+suggestion.category;
   fill.setAttribute('aria-label','Fill search with '+suggestion.label);
   fill.addEventListener('click',()=>{
    search.value=suggestion.label;
    search.dispatchEvent(new Event('input',{bubbles:true}));
    hide();
    search.focus();
   });
   const source=document.createElement('a');
   source.className='qhss-source';
   source.textContent='Original source';
   source.href=suggestion.sourceUrl;
   source.target='_blank';
   source.rel='noopener noreferrer';
   item.append(fill,source);
   panel.append(item);
  }
  panel.hidden=rows.length===0;
  search.setAttribute('aria-expanded',String(rows.length>0));
 };
 search.addEventListener('input',display);
 search.addEventListener('focus',display);
 search.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 document.addEventListener('pointerdown',event=>{
  if(!wrapper.contains(event.target))hide();
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountHomeSearchAssistance,{once:true});
 else mountHomeSearchAssistance();
}
