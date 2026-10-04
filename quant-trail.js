(function(global){
'use strict';
const ledger=()=>global.QuantaUnifiedTokenLedger;
const stamp=()=>new Date().toISOString();
async function sync(record){if(record?.stage==='research')try{await global.QuantaInfinityCredit?.persistResearch?.(record)}catch(error){console.warn('Research trail retained for cloud retry',error)}}
async function link(childId,parentId,relation='next-search',term=''){
 const changed=await ledger().mutate(all=>{
  const child=all.find(x=>x.id===childId),parent=all.find(x=>x.id===parentId);
  if(!child)return [];
  if(!parent||parent===child){child.trail=child.trail||{version:1,rootId:child.id,parentId:null,children:[],containedQuantIds:[]};return[child]}
  const seen=new Set([childId]);let cursor=parent;
  while(cursor){if(seen.has(cursor.id))throw new Error('A research trail cannot contain a cycle');seen.add(cursor.id);cursor=all.find(x=>x.id===cursor.trail?.parentId)}
  child.trail={version:1,rootId:parent.trail?.rootId||parent.id,parentId:parent.id,relation,term:String(term).slice(0,500),children:child.trail?.children||[],containedQuantIds:[...new Set([parent.id,...(parent.trail?.containedQuantIds||[])])],linkedAt:stamp()};
  parent.trail={version:1,rootId:parent.id,parentId:null,containedQuantIds:[],...parent.trail,children:[...new Set([...(parent.trail?.children||[]),child.id])]};
  child.updatedAt=parent.updatedAt=stamp();return[child,parent];
 });
 void Promise.all(changed.map(sync));return changed;
}
async function include(id,query){
 const changed=await ledger().mutate(all=>{
  const current=all.find(x=>x.id===id),prior=all.find(x=>x.id!==id&&String(x.query||'').toLowerCase()===String(query||'').toLowerCase());if(!current||!prior)return[];
  const pending=[prior.id],seen=new Set();while(pending.length){const next=pending.pop();if(next===id)return[];if(seen.has(next))continue;seen.add(next);const record=all.find(x=>x.id===next);pending.push(...(record?.trail?.containedQuantIds||[]),...[record?.trail?.parentId].filter(Boolean))}
  current.trail={version:1,rootId:id,parentId:null,children:[],...current.trail,containedQuantIds:[...new Set([...(current.trail?.containedQuantIds||[]),prior.id])]};current.updatedAt=stamp();return[current];
 });await Promise.all(changed.map(sync));return changed;
}
function extraction(query,sections,evidence){
 const sources=(evidence||[]).slice(0,40).map((x,i)=>({index:x.index??i,title:String(x.title||''),url:String(x.url||''),excerpt:String(x.evidence||x.snippet||'').slice(0,1200)}));
 return{version:1,query,updatedAt:stamp(),reviewStatus:'AI-assisted extraction; not independently reviewed',entries:(sections?.yellow||[]).map(x=>({value:String(x.value||x.label||'').slice(0,500),sourceIndexes:Array.isArray(x.source_indexes)?x.source_indexes:[],status:'extracted'})),sources};
}
async function expanded(id,terms,kind){
 if(!id)return;const changed=await ledger().mutate(all=>{
  const token=all.find(x=>x.id===id);if(!token)return[];
  token.dataExtraction={version:1,query:token.query,...token.dataExtraction,discoveryTerms:terms.slice(0,100).map(x=>typeof x==='string'?{value:x,method:kind,status:'discovery; check source before reuse'}:{value:String(x.value||''),category:String(x.category||''),sourceQuery:String(x.source_query||''),method:kind,status:'AI-assisted discovery; check source before reuse'}),updatedAt:stamp()};token.updatedAt=stamp();return[token];
 });await Promise.all(changed.map(sync));
}
const lessons=[{test:/\bruthenium\b/i,path:'/learn/ruthenium/',title:'Ruthenium: element 44'},{test:/\batomic number\b/i,path:'/learn/atomic-number/',title:'Atomic number, mass number and isotopes'}];
async function render(id){
 const host=document.getElementById('overview');if(!host||id!==global.__qActiveTokenId)return;
 host.querySelector('#qResearchTrail')?.remove();const all=await ledger().load();if(id!==global.__qActiveTokenId)return;
 const token=all.find(x=>x.id===id);if(!token)return;
 const section=document.createElement('section');section.id='qResearchTrail';section.className='qzone qzonePurple';
 const title=document.createElement('h3');title.textContent='Research trail';section.append(title);
 const note=document.createElement('p');note.textContent='Each new search creates its own Quant. Linked Quants keep their sources and connections; references do not add to your balance.';section.append(note);
 for(const [label,ids] of [['Parent',[token.trail?.parentId]],['Earlier context',token.trail?.containedQuantIds||[]],['Follow-up searches',token.trail?.children||[]]])for(const relatedId of [...new Set(ids.filter(Boolean))]){
  const related=all.find(x=>x.id===relatedId);if(!related)continue;
  const b=document.createElement('button');b.type='button';b.className='qtrailLink';b.textContent=label+': '+(related.query||related.title||'Saved Quant');b.onclick=()=>{document.getElementById('q').value=related.query||related.title||'';global.QuantaResearch.openSaved(related.id)};section.append(b);
 }
 for(const lesson of lessons.filter(x=>x.test.test(token.query||''))){const a=document.createElement('a');a.href=lesson.path;a.textContent='Read the public lesson: '+lesson.title;section.append(a)}
 const a=document.createElement('a');a.href='/learn/search-to-quants/';a.textContent='How searches and extraction become Quants';section.append(a);host.append(section);
}
global.QuantaResearch={link,include,extraction,expanded,render,openSaved:null,lessons};
})(window);
