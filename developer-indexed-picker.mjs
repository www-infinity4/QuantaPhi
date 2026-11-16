/* Index thousands of real source records without mounting thousands of DOM cards.
 * Every result opens the existing single-card viewer; no code is executed.
 */
import {DEVELOPMENT_TOPICS} from './developer-discovery-core.mjs';
import {searchIndexedResources} from './developer-indexed-search.mjs';
const make=(tag,className,text)=>{
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(text!==undefined)n.textContent=text;
 return n;
};
export function mountIndexedDeveloperPicker(panel,{stage,showIndex}){
 const wrap=panel.appendChild(make('section','devlib-indexed'));
 wrap.setAttribute('aria-label','Search the indexed Developer source catalog');
 wrap.appendChild(make('h4','devlib-index-heading','Browse the indexed GitHub library'));
 wrap.appendChild(make('p','devlib-index-intro','Find a real repository by name, topic or purpose; open its working design workspace in the card. Only reviewed source metadata appears here.'));
 const form=wrap.appendChild(make('form','devlib-index-form'));
 form.setAttribute('role','search');
 const topic=form.appendChild(make('select','devlib-index-topic'));
 topic.setAttribute('aria-label','Filter indexed developer cards by topic');
 const all=topic.appendChild(make('option','','All development topics'));all.value='all';
 for(const item of DEVELOPMENT_TOPICS){
  const opt=topic.appendChild(make('option','',item.label));opt.value=item.id;
 }
 const query=form.appendChild(make('input','devlib-index-query'));
 query.type='search';query.autocomplete='off';query.maxLength=80;
 query.placeholder='Profile, button, carousel…';
 query.setAttribute('aria-label','Search indexed developer cards');
 const submit=form.appendChild(make('button','devlib-index-find','Find in library'));
 submit.type='submit';
 const summary=wrap.appendChild(make('p','devlib-index-count','Loading indexed GitHub sources…'));
 summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
 const results=wrap.appendChild(make('div','devlib-index-results'));
 results.setAttribute('aria-label','Matching indexed developer cards');
 const paging=wrap.appendChild(make('div','devlib-index-paging'));
 const previous=paging.appendChild(make('button','','Previous indexed results'));previous.type='button';
 const next=paging.appendChild(make('button','','Next indexed results'));next.type='button';
 const entries=[],ids=new Set();
 let offset=0,activeResult={items:[],total:0,offset:0,nextOffset:null,previousOffset:null};
 function display(){
  activeResult=searchIndexedResources(entries,{topic:topic.value,query:query.value,offset,limit:8});
  offset=activeResult.offset;
  results.replaceChildren();
  previous.disabled=activeResult.previousOffset===null;
  next.disabled=activeResult.nextOffset===null;
  if(activeResult.total===0){
   summary.textContent=entries.length
    ?'No matching source cards. Try another topic or search phrase.'
    :'No indexed GitHub cards are loaded yet. The original builders and official references remain available.';
   return;
  }
  const from=activeResult.offset+1;
  const through=activeResult.offset+activeResult.items.length;
  summary.textContent=from+'–'+through+' of '+activeResult.total+' matches · '+entries.length.toLocaleString()+' indexed GitHub source cards';
  for(const entry of activeResult.items){
   const source=entry.resource;
   const button=results.appendChild(make('button','devlib-index-result'));
   button.type='button';button.setAttribute('aria-label','Open '+source.label+' in Developer card');
   button.append(make('strong','',source.label),
    make('small','',DEVELOPMENT_TOPICS.find(x=>x.id===source.category)?.label||'Developer source'));
   button.addEventListener('click',()=>{
    showIndex(entry.index);
    stage.scrollIntoView?.({block:'start',behavior:'smooth'});
   });
  }
 }
 function reset(){offset=0;display();}
 form.addEventListener('submit',event=>{event.preventDefault();reset();});
 query.addEventListener('input',reset);
 topic.addEventListener('change',reset);
 previous.addEventListener('click',()=>{if(activeResult.previousOffset!==null){offset=activeResult.previousOffset;display();}});
 next.addEventListener('click',()=>{if(activeResult.nextOffset!==null){offset=activeResult.nextOffset;display();}});
 display();
 return {
  addResources(resources,firstIndex){
   if(!Number.isInteger(firstIndex)||firstIndex<0||!Array.isArray(resources))return;
   resources.forEach((resource,i)=>{
    if(resource?.source!=='GitHub'||!resource.id||ids.has(resource.id)||firstIndex+i>=6000)return;
    ids.add(resource.id);
    entries.push({resource,index:firstIndex+i});
   });
   display();
  }
 };
}
