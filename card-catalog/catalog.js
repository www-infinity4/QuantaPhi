(()=>{'use strict';
const $=id=>document.getElementById(id);
const cards=$('cards'),filter=$('catalogSearch'),category=$('category'),fields=$('fields');
const list=[];let all=[],active=null;
const working=new Set(['search-engine','search-viewer']);
const nameDefault=id=>({'search-engine':'My Search','search-viewer':'Research Viewer','reads-realms':'My Infinite Reader','asteroid':'My Asteroid Stories','scholastic-reader':'My Scholastic Reader','radio':'My Radio'})[id]||'My Card';
const label=c=>c.status==='previewable'?'Working template':'Adapter needed';
const compact=s=>String(s||'').trim().replace(/\s+/g,' ').slice(0,140);
const safeUrl=value=>{try{const x=new URL(value);return x.protocol==='https:'?x.origin:''}catch{return''}};
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n};
function draw(){
 const q=compact(filter.value).toLowerCase();
 cards.replaceChildren();
 const found=all.filter(c=>(!category.value||c.category===category.value)&&(!q||[c.name,c.category,c.id,c.source.repo,...c.options].join(' ').toLowerCase().includes(q)));
 $('count').textContent=found.length+' elements · '+found.filter(c=>working.has(c.id)).length+' working embed templates';
 for(const c of found){
  const b=make('button','card');b.type='button';b.setAttribute('aria-pressed',String(active?.id===c.id));
  b.append(make('span','tag',c.category),make('strong','',c.name),make('small',c.status==='previewable'?'Ready to preview · customize':'Registered source · adapter needed'),make('span',working.has(c.id)?'tag':'tag pending',label(c)));
  b.addEventListener('click',()=>choose(c));cards.append(b);
 }
 if(!found.length)cards.append(make('p','muted','No cards match. Try Search Engine, radio, reader, or viewer.'));
}
function addField(title,input){const l=make('label','',title);l.htmlFor=input.id;fields.append(l,input)}
function choose(c){
 active=c;draw();fields.replaceChildren();
 const name=make('input');name.id='cardName';name.name='name';name.value=nameDefault(c.id);name.maxLength=60;name.required=true;addField('What do you call this card?',name);
 if(c.id==='search-engine'||c.id==='search-viewer'){
  const mode=make('select');mode.id='cardMode';mode.name='mode';
  for(const [value,title]of [['quanta-style','QuantaPhi-style · overview + results'],['overview-first','AI overview first · sources below'],['image-first','Images first · visual results'],['links-only','Links only · skip AI']]){
   const op=make('option','',title);op.value=value;mode.append(op);
  }
  mode.value=c.id==='search-engine'?'quanta-style':'overview-first';addField('Search layout',mode);
 }else if(c.id==='reads-realms'){
  const subject=make('input');subject.id='cardSubject';subject.name='subject';subject.placeholder='Your original research and story subjects';subject.maxLength=160;addField('What will your reader explore?',subject);
  const access=make('select');access.id='cardAccess';access.name='access';
  for(const [v,t]of [['free','Free reader'],['paid','Paid reader · settlement integration required']]){const o=make('option','',t);o.value=v;access.append(o)}addField('Reader access',access);
 }else{
  const subject=make('input');subject.id='cardSubject';subject.name='subject';subject.placeholder='Topics, sources and personalization';subject.maxLength=160;addField('Your topics and customization',subject);
 }
 $('selectedHelp').textContent=c.name+' · from '+c.source.repo+'/'+c.source.path+'. '+(working.has(c.id)?'Available as a working template; data sync to your site is not yet hosted.':'This is a design blueprint until its safe tenant adapter is wired.');
 $('add').disabled=false;
 fields.querySelectorAll('input,select').forEach(input=>input.addEventListener('input',preview));
 preview();
}
function current(){
 if(!active)return null;
 const options={name:compact($('cardName')?.value||nameDefault(active.id))};
 for(const key of ['mode','subject','access']){const el=$('card'+key[0].toUpperCase()+key.slice(1));if(el)options[key]=compact(el.value)}
 return{id:active.id,options};
}
function preview(){
 const item=current();$('previewBody').replaceChildren();
 if(!item)return;
 if(working.has(item.id)){
  const frame=make('iframe');frame.title=(item.options.name||'Phi')+' working preview';
  const u=new URL('/card-catalog/search.html',location.origin);
  u.search=new URLSearchParams({title:item.options.name||'My Search',mode:item.options.mode||'quanta-style',viewer:String(item.id==='search-viewer'),q:'solar panels'});
  frame.src=u.href;$('previewBody').append(frame);
  $('previewState').textContent='Interactive search + source viewer';
 }else{
  const note=make('div','preview-note');note.append(make('h3','',item.options.name||active.name),make('p','',active.name+' can reuse the existing Phi source mechanics, but it requires a tenant-safe API adapter before publishing.'),make('p','',item.id==='reads-realms'?'Your reader will use your own topics, authoring rules and indexed stories. It will not copy the private Reads & Realms library.':'The catalog keeps a configurable record without claiming this card works as an embed yet.'));
  $('previewBody').append(note);$('previewState').textContent='Blueprint · not a live card';
 }
}
function blueprint(){return{schema:'phi-site-cards/v1',site:{name:compact($('siteName').value)||'My Phi site',origin:safeUrl($('siteOrigin').value)||null},cards:list.map(x=>({id:x.id,instanceId:x.instanceId,options:{...x.options}}))}}
function refresh(){
 $('chosen').replaceChildren();for(const item of list){
  const row=make('div','chosen-row'),left=make('div');left.append(make('strong','',item.options.name),make('span','',item.id+' · '+(working.has(item.id)?'embeddable':'adapter required')));
  const remove=make('button','','Remove');remove.type='button';remove.addEventListener('click',()=>{list.splice(list.indexOf(item),1);refresh()});row.append(left,remove);$('chosen').append(row);
 }
 $('numSelected').textContent=String(list.length);$('export').disabled=!list.length;
 const good=list.filter(x=>working.has(x.id));$('copy').disabled=!good.length;
 const manifest={...blueprint(),cards:good};
 const encoded=encodeURIComponent(JSON.stringify(manifest));
 $('snippet').value=good.length?'<script async src="https://quantaphi.org/card-catalog/embed.js" data-phi-config="'+encoded+'"></'+'script>':'';
}
$('configForm').addEventListener('submit',event=>{
 event.preventDefault();const item=current();if(!item||!item.options.name)return;
 item.instanceId='phi-card-'+String(Date.now())+'-'+list.length;list.push(item);refresh();
});
$('export').addEventListener('click',()=>{
 const data=JSON.stringify(blueprint(),null,2),blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=make('a');a.href=url;a.download='phi-website-cards.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
$('copy').addEventListener('click',async()=>{
 if(!$('snippet').value)return;
 try{await navigator.clipboard.writeText($('snippet').value);$('copy').textContent='Embed code copied ✓'}catch{$('snippet').focus();$('snippet').select();$('copy').textContent='Select and copy code'} 
});
filter.addEventListener('input',draw);category.addEventListener('change',draw);
fetch('./catalog.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('registry-unavailable');return r.json()}).then(data=>{
 all=data.cards;if(!Array.isArray(all))throw Error('bad-registry');
 for(const x of [...new Set(all.map(c=>c.category))].sort()){const op=make('option','',x);op.value=x;category.append(op)}
 draw();const initial=new URLSearchParams(location.search).get('card');
 if(initial){const found=all.find(c=>c.id===initial);if(found)choose(found)}
}).catch(()=>{$('count').textContent='Card registry unavailable. Reload this page.'});
})();
