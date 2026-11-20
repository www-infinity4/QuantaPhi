import {SOURCE_STATUSES,filterSources,VERIFIED_COOPERATIVE_ADVERTISERS} from './quanta-sources-data.mjs?v=20261101-1';
const container=document.getElementById('sources');
const count=document.getElementById('sourceCount');
const search=document.getElementById('sourceSearch');
const category=document.getElementById('sourceCategory');
const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function draw(){
 const rows=filterSources({category:category.value,query:search.value});
 const frag=document.createDocumentFragment();
 for(const row of rows){
  const card=element('article','card'),heading=element('h3','',row.name),status=element('span','status',SOURCE_STATUSES[row.status]);
  const p=element('p','',row.detail),links=element('div','links');
  for(const [text,url] of [['Evidence',row.evidence],['Original source',row.website]]){
   const a=element('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);
  }
  card.append(heading,status,p,links);frag.append(card);
 }
 container.replaceChildren(frag);count.textContent=rows.length+' source entries shown · '+VERIFIED_COOPERATIVE_ADVERTISERS.length+' confirmed paid cooperatives';
}
search.addEventListener('input',draw);
category.addEventListener('change',draw);
draw();
